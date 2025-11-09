from app.llm_client import llm_chat
from app.schemas import ShortlistRequest, ShortlistResponse, ShortlistItem
from app.models.preferences import CarPreferences
import requests
from app.config import SERPAPI_KEY
from langgraph.graph import StateGraph, END
from typing import Annotated, TypeVar, List, Dict, Any
import re
import logging
import os
import json
import concurrent.futures

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define state keys that can receive multiple updates
STATE_KEY = Annotated[Dict, "state"]
SUGGESTIONS_KEY = Annotated[List, "suggestions"]

def llm_decision_node(state: Dict) -> Dict:
    """LLM decides next action based on current state - makes the agent truly autonomous."""
    logger.debug(f"llm_decision_node received state: {state}")
    
    # Preserve existing state
    new_state = state.copy()
    
    # Check for critical failures first
    if state.get('error'):
        logger.error(f"Critical error encountered: {state['error']}")
        new_state['decision'] = 'end'
        return new_state
    
    # Check attempts first - give MORE room to aggregate diverse results
    if state.get('attempts', 0) >= 8:  # Increased to 8 attempts for better aggregation
        logger.info("Max attempts reached, ending search")
        new_state['decision'] = 'end'
        return new_state

    # Target 15-20 results for a great swipe experience
    if len(state.get('suggestions', [])) >= 15:
        logger.info("Found enough suggestions for swipe experience, ending search")
        new_state['decision'] = 'end'
        return new_state

    # === LLM DECISION MAKING - Let the agent reason about next steps ===
    try:
        # Build context for LLM
        current_suggestions = state.get('suggestions', [])
        attempts = state.get('attempts', 0)
        original_query = state.get('original_query', state.get('query', ''))
        last_query = state.get('query', '')
        price = state.get('price', 20000)
        features = state.get('features', [])
        body_styles = state.get('body_styles', [])
        min_price = state.get('min_price', int(price * 0.7))
        max_price = state.get('max_price', int(price * 1.0))
        price_range = f"${min_price//1000}k to ${max_price//1000}k"
        
        # Prepare LLM prompt - optimized for AGGREGATING MANY diverse cars
        prompt = f"""You are an AI car shopping assistant. Your goal: find 15-20 DIVERSE car options for a "dating app" swipe experience.

USER PREFERENCES:
- Budget: ${price:,} (strict range: {price_range})
- Body styles: {', '.join(body_styles) if body_styles else 'any'}
- Features desired: {', '.join(features) if features else 'reliable, affordable'}

SEARCH PROGRESS:
- Attempt #{attempts + 1}/8
- Last query: "{last_query}"
- Cars found so far: {len(current_suggestions)}/15 target

CURRENT RESULTS:
{chr(10).join([f"- {s.get('year', 'N/A')} {s.get('make', 'N/A')} {s.get('model', 'N/A')}" for s in current_suggestions[:8]])}

AGGRESSIVE SEARCH STRATEGY - Your goal is to MAXIMIZE diversity and quantity:

1. If < 5 results:
   - Cast a WIDE net with broad searches
   - Use category terms, not specific models (let search discover cars)
   - ALWAYS include price range in query
   - Example: "reliable sedan compact price {price_range}"
   - Example: "fuel efficient hatchback price {price_range}"

2. If 5-10 results:
   - Target DIFFERENT segments you haven't explored yet
   - Search competing categories, different body styles
   - ALWAYS include price range
   - Example: "midsize SUV crossover reliable price {price_range}"
   - Example: "luxury sedan premium price {price_range}"
   
3. If 10-14 results:
   - Find NICHE options or value picks
   - Search less common categories, value propositions
   - ALWAYS include price range
   - Example: "sporty coupe performance price {price_range}"
   - Example: "wagon versatile reliable price {price_range}"

CRITICAL RULES:
- DO NOT use specific brand/model names (Honda, Toyota, etc.) - use CATEGORIES instead
- Use terms like "reliable sedan", "compact SUV", "luxury crossover", "sporty hatchback"
- ALWAYS include "price {price_range}" in your query for better filtering
- Focus on CATEGORIES and CHARACTERISTICS, not specific manufacturers
- Let the search engine discover diverse options across all brands
- If approaching 15 results, search for final niche categories then END

Return ONLY valid JSON:
{{
    "reasoning": "why this search will add diverse results",
    "next_query": "specific search targeting multiple cars",
    "decision": "search" or "end"
}}

NO MARKDOWN. NO THINKING. ONLY JSON."""

        logger.info(f"Asking LLM to decide next search strategy...")
        
        # Call LLM with structured output
        llm_response = llm_chat(
            prompt,
            response_format={"type": "json_object"}
        )
        
        logger.info(f"LLM decision response: {llm_response}")
        
        # Parse LLM decision - handle both dict and string responses
        if isinstance(llm_response, dict):
            if 'error' in llm_response:
                raise Exception(f"LLM error: {llm_response.get('content', llm_response.get('error'))}")
            decision_data = llm_response
        else:
            # Try to parse as JSON string
            import json
            decision_data = json.loads(llm_response)
        
        reasoning = decision_data.get('reasoning', 'No reasoning provided')
        next_query = decision_data.get('next_query', last_query)
        decision = decision_data.get('decision', 'search')
        
        logger.info(f"LLM Reasoning: {reasoning}")
        logger.info(f"Next Query: {next_query}")
        logger.info(f"Decision: {decision}")
        
        # Update state with LLM decision
        new_state['query'] = next_query
        new_state['decision'] = decision
        new_state['llm_reasoning'] = reasoning
        
    except Exception as e:
        logger.error(f"LLM decision failed: {e}, falling back to rule-based logic")
        
        # FALLBACK: Aggressive rule-based logic if LLM fails
        # Use simpler queries that are more likely to find car listings
        current_count = len(state.get('suggestions', []))
        price = int(state.get('price', 20000))
        min_price = state.get('min_price', int(price * 0.7))
        max_price = state.get('max_price', int(price * 1.0))
        body_styles = state.get('body_styles', ['car'])
        body_style = body_styles[0] if body_styles else 'car'
        
        if current_count == 0 and state.get('attempts', 0) > 0:
            # No results, try very simple query
            new_state['query'] = f"used {body_style} for sale"
            logger.info(f"Fallback: No results, using simple query: {new_state['query']}")
        elif current_count < 5:
            # Few results, search for specific price range
            new_state['query'] = f"used {body_style} under ${max_price//1000}k"
            logger.info(f"Fallback: Few results, searching with price: {new_state['query']}")
        elif current_count < 10:
            # Moderate results, try certified pre-owned
            new_state['query'] = f"certified pre-owned {body_style}"
            logger.info(f"Fallback: Searching CPO: {new_state['query']}")
        else:
            # Good number of results, search for value picks
            new_state['query'] = f"best used {body_style} deals"
            logger.info(f"Fallback: Searching deals: {new_state['query']}")
        
        new_state['decision'] = 'search'
    
    # Update attempts counter
    new_state['attempts'] = state.get('attempts', 0) + 1
    
    return new_state

def search_node(state: Dict) -> Dict:
    """Search for cars using SerpAPI."""
    logger.debug(f"search_node received state: {state}")
    
    # Preserve existing state
    new_state = state.copy()

    if not state.get('query'):
        logger.error("No search query provided")
        new_state['error'] = "No search query provided"
        return new_state

    try:
        params = {
            'engine': 'google',
            'q': state['query'],
            'api_key': SERPAPI_KEY,
            'num': 20,  # Increased to get more results per search
            'gl': 'us',
            'tbs': 'qdr:y'  # Recent results only
        }
        resp = requests.get('https://serpapi.com/search', params=params)
        resp.raise_for_status()
        results = resp.json()
        
        if 'error' in results:
            logger.error(f"SerpAPI error: {results['error']}")
            new_state['error'] = results['error']
            return new_state
        
        suggestions = []
        for result in results.get('organic_results', []):
            title = result.get('title', '')
            snippet = result.get('snippet', '')
            search_text = f"{title} {snippet}"
            
            # Look for year make model patterns - stricter regex
            # Match patterns like "2020 Honda Civic" but not "2020 Kia K"
            matches = re.finditer(r'(\b20[12]\d|\b19[89]\d)\s+([A-Z][a-z]+)\s+([A-Z][a-z]{2,})', search_text)
            
            for match in matches:
                year, make, model = match.groups()
                
                # Skip if year is unreasonable
                if not (1990 <= int(year) <= 2025):
                    continue
                
                # Skip if make or model is too short (likely broken)
                if len(make) < 3 or len(model) < 3:
                    logger.debug(f"Skipping short/invalid: {year} {make} {model}")
                    continue
                    
                suggestion = {
                    'make': make.title(),
                    'model': model.title(),
                    'year': year,
                    'url': result.get('link', ''),
                    'source': 'serpapi'
                }
                
                # Skip social media URLs (Instagram, Facebook, TikTok, etc.)
                url_lower = result.get('link', '').lower()
                if any(domain in url_lower for domain in ['instagram.com', 'facebook.com', 'tiktok.com', 'twitter.com', 'youtube.com']):
                    logger.debug(f"Skipping social media link: {year} {make} {model}")
                    continue
                
                # Deduplicate within current batch
                if suggestion not in suggestions:
                    suggestions.append(suggestion)
        
        logger.debug(f"Found {len(suggestions)} suggestions from this search")
        
        # BOOST: If we got very few results, try a complementary search
        # This helps aggregate more results per iteration
        if len(suggestions) < 5 and state.get('attempts', 0) < 7:  # Don't boost on last attempt
            logger.info(f"Boosting search - only found {len(suggestions)} results, running complementary query...")
            
            # Generate a complementary query - simpler format for better results
            price = state.get('price', 20000)
            max_price = state.get('max_price', int(price * 1.0))
            body_styles = state.get('body_styles', ['car'])
            body_style = body_styles[0] if body_styles else 'car'
            
            # Simple boost query that's more likely to find listings
            boost_query = f"used {body_style} for sale near me"
            
            try:
                # Run boost search
                boost_params = {
                    'engine': 'google',
                    'q': boost_query,
                    'api_key': SERPAPI_KEY,
                    'num': 15,
                    'gl': 'us',
                    'tbs': 'qdr:y'
                }
                boost_resp = requests.get('https://serpapi.com/search', params=boost_params)
                boost_resp.raise_for_status()
                boost_results = boost_resp.json()
                
                boost_suggestions = []
                for result in boost_results.get('organic_results', []):
                    title = result.get('title', '')
                    snippet = result.get('snippet', '')
                    search_text = f"{title} {snippet}"
                    
                    matches = re.finditer(r'(\b20[12]\d|\b19[89]\d)\s+([A-Z][a-z]+)\s+([A-Z][a-z]{2,})', search_text)
                    
                    for match in matches:
                        year, make, model = match.groups()
                        
                        if not (1990 <= int(year) <= 2025):
                            continue
                        
                        if len(make) < 3 or len(model) < 3:
                            continue
                            
                        boost_suggestion = {
                            'make': make.title(),
                            'model': model.title(),
                            'year': year,
                            'url': result.get('link', ''),
                            'source': 'serpapi_boost'
                        }
                        
                        # Skip social media
                        url_lower = result.get('link', '').lower()
                        if any(domain in url_lower for domain in ['instagram.com', 'facebook.com', 'tiktok.com', 'twitter.com', 'youtube.com']):
                            continue
                        
                        if boost_suggestion not in boost_suggestions:
                            boost_suggestions.append(boost_suggestion)
                
                logger.info(f"Boost search found {len(boost_suggestions)} additional suggestions")
                suggestions.extend(boost_suggestions[:5])  # Add up to 5 from boost
                
            except Exception as boost_error:
                logger.warning(f"Boost search failed: {boost_error}, continuing with original results")
        
        # Update suggestions while preserving other state - take more results per search
        new_state['suggestions'] = (state.get('suggestions', []) + suggestions[:12])  # Increased to 12 per iteration
        return new_state
        
    except requests.RequestException as e:
        logger.error(f"Search request failed: {e}")
        new_state['error'] = f"Search request failed: {str(e)}"
        return new_state
    except Exception as e:
        logger.error(f"Search failed: {e}")
        new_state['error'] = str(e)
        return new_state

def parallel_search_cars(query, min_price, max_price, num_queries=3):
    """
    Run multiple diverse search queries in parallel for faster results.
    Returns combined suggestions from all queries.
    """
    logger.info(f"Running {num_queries} parallel searches...")
    
    price_range = f"${min_price//1000}k to ${max_price//1000}k"
    
    # Generate diverse query variations - more specific to find actual car listings
    queries = [
        f"used {query} for sale",
        f"certified pre-owned sedan {min_price//1000}k",
        f"used luxury sedan under {max_price//1000}k",
        f"pre-owned SUV {min_price//1000}k to {max_price//1000}k"
    ][:num_queries]
    
    all_suggestions = []
    
    def search_single_query(q):
        """Search a single query via SerpAPI."""
        try:
            params = {
                'engine': 'google',
                'q': q,
                'api_key': SERPAPI_KEY,
                'num': 15,
                'gl': 'us',
                'tbs': 'qdr:y'
            }
            resp = requests.get('https://serpapi.com/search', params=params, timeout=30)
            resp.raise_for_status()
            results = resp.json()
            
            suggestions = []
            for result in results.get('organic_results', []):
                title = result.get('title', '')
                snippet = result.get('snippet', '')
                search_text = f"{title} {snippet}"
                
                # Stricter regex for valid cars
                matches = re.finditer(r'(\b20[12]\d|\b19[89]\d)\s+([A-Z][a-z]+)\s+([A-Z][a-z]{2,})', search_text)
                
                for match in matches:
                    year, make, model = match.groups()
                    
                    if not (1990 <= int(year) <= 2025):
                        continue
                    
                    if len(make) < 3 or len(model) < 3:
                        continue
                    
                    suggestion = {
                        'make': make.title(),
                        'model': model.title(),
                        'year': year,
                        'url': result.get('link', ''),
                        'source': 'serpapi_parallel'
                    }
                    
                    # Skip social media
                    url_lower = result.get('link', '').lower()
                    if any(domain in url_lower for domain in ['instagram.com', 'facebook.com', 'tiktok.com']):
                        continue
                    
                    suggestions.append(suggestion)
            
            logger.info(f"Query '{q[:50]}...' found {len(suggestions)} suggestions")
            return suggestions
            
        except Exception as e:
            logger.error(f"Parallel search failed for '{q}': {e}")
            return []
    
    # Run searches in parallel using ThreadPoolExecutor
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_queries) as executor:
        future_to_query = {executor.submit(search_single_query, q): q for q in queries}
        for future in concurrent.futures.as_completed(future_to_query):
            query_results = future.result()
            all_suggestions.extend(query_results)
    
    # Deduplicate
    seen = set()
    unique_suggestions = []
    for sugg in all_suggestions:
        key = f"{sugg['year']}_{sugg['make']}_{sugg['model']}"
        if key not in seen:
            seen.add(key)
            unique_suggestions.append(sugg)
    
    logger.info(f"Parallel search complete: {len(unique_suggestions)} unique suggestions from {len(all_suggestions)} total")
    return unique_suggestions

def get_car_suggestions(data):
    """Main function to get car suggestions."""
    logger.info(f"get_car_suggestions received data: {data}")
    
    # Load preferences if available
    prefs = CarPreferences()
    if os.path.exists('data/preferences.json'):
        prefs.load('data/preferences.json')
    
    # Build initial query - handle both frontend naming conventions
    body_types = data.get('bodyTypes') or data.get('body_styles', [])
    body_style = body_types[0] if body_types else 'car'
    
    # Extract features - handle both string and object formats
    features_raw = data.get('features', [])
    features = []
    for f in features_raw:
        if isinstance(f, dict):
            features.append(f.get('name', ''))
        elif isinstance(f, str):
            features.append(f)
    features = [f for f in features if f]  # Remove empty strings
    
    # Get price from budget or price field
    price = data.get('budget') or data.get('price', 20000)
    
    # Calculate strict price range (70-100% of budget) for filtering
    min_price = int(price * 0.7)
    max_price = int(price * 1.0)
    price_range = f"${min_price//1000}k to ${max_price//1000}k"
    
    logger.info(f"Budget: ${price:,}, Price range: ${min_price:,} - ${max_price:,}")
    
    # Build generic initial query - handle both frontend naming conventions
    # Simpler queries that are more likely to find actual car listings
    body_style_text = body_types[0] if body_types else 'car'
    
    # Simpler query format that works better with search engines
    query = f"used {body_style_text} for sale under ${max_price//1000}k"
    
    logger.info(f"Initial search query: {query}")
    logger.info(f"Target price range: {price_range}")
    
    # Initialize state
    state = {
        'query': query,
        'original_query': query,
        'price': price,
        'min_price': min_price,
        'max_price': max_price,
        'features': features,
        'body_styles': body_types if isinstance(body_types, list) else [body_types],
        'attempts': 0,
        'suggestions': [],
        'decision': 'search',
        'error': None,
        'llm_reasoning': None
    }

    # FAST HYBRID APPROACH: Run parallel searches + LLM suggestions concurrently
    # This is much faster than sequential LLM-driven iterations
    logger.info("🚀 Using FAST HYBRID approach: Parallel searches + LLM suggestions")
    
    all_suggestions = []
    
    # Method 1: Get direct LLM recommendations (instant)
    llm_suggestions = llm_suggest_cars(price, min_price, max_price, body_types, features)
    all_suggestions.extend(llm_suggestions)
    logger.info(f"LLM direct: {len(llm_suggestions)} suggestions")
    
    # Method 2: Run parallel diverse searches (fast)
    parallel_suggestions = parallel_search_cars(query, min_price, max_price, num_queries=4)
    all_suggestions.extend(parallel_suggestions)
    logger.info(f"Parallel search: {len(parallel_suggestions)} suggestions")
    
    # Deduplicate combined results
    seen_models = set()
    unique_suggestions = []
    for sugg in all_suggestions:
        model_key = f"{sugg.get('make', '').lower()}_{sugg.get('model', '').lower()}_{sugg.get('year', '')}"
        if model_key not in seen_models:
            seen_models.add(model_key)
            unique_suggestions.append(sugg)
    
    logger.info(f"Combined: {len(unique_suggestions)} unique suggestions")
    
    # If we got suggestions from fast methods, skip slow LLM-driven workflow
    if len(unique_suggestions) >= 5:
        logger.info(f"Fast methods found {len(unique_suggestions)} cars, skipping slow workflow")
        suggestions = unique_suggestions
    else:
        logger.info(f"Fast methods only found {len(unique_suggestions)}, falling back to LLM workflow")
        # Fall back to original LLM-driven workflow if fast methods failed
        workflow = StateGraph(state_schema=Dict[str, Any])
        workflow.add_node('llm_decision', llm_decision_node)
        workflow.add_node('search', search_node)
        
        def router(state: Dict) -> str:
            return state.get('decision', 'search')
        
        workflow.add_edge('search', 'llm_decision')
        workflow.add_conditional_edges('llm_decision', router, {'search': 'search', 'end': END})
        workflow.set_entry_point('llm_decision')
        
        result = workflow.compile().invoke(state)
        
        if not result.get('suggestions') and result.get('error'):
            logger.error(f"Search failed: {result['error']}")
            return {'error': result['error'], 'suggestions': []}
        
        suggestions = result.get('suggestions', [])
    
    if suggestions:
        logger.info(f"Processing {len(suggestions)} raw suggestions")
        
        # NO YEAR FILTERING - price is the primary filter now
        # Deduplication only (keep different years of same model)
        
        # Deduplicate by make/model/year (keep different years of same model)
        # This allows showing "2018 Honda Civic" AND "2020 Honda Civic" as different options
        seen_models = set()
        unique_suggestions = []
        for sugg in suggestions:
            # Use make + model + year as unique key (more granular than before)
            model_key = f"{sugg.get('make', '').lower()}_{sugg.get('model', '').lower()}_{sugg.get('year', '')}"
            if model_key not in seen_models:
                seen_models.add(model_key)
                unique_suggestions.append(sugg)
            else:
                logger.debug(f"Skipping duplicate: {sugg.get('year')} {sugg.get('make')} {sugg.get('model')}")
        
        logger.info(f"After deduplication: {len(unique_suggestions)} unique make/model/year combinations (from {len(suggestions)})")
        suggestions = unique_suggestions
        
        # 3. Calculate weights
        weights = prefs.get_preference_weights(suggestions)
        
        # 4. Sort suggestions by weight
        weighted_suggestions = list(zip(suggestions, weights))
        weighted_suggestions.sort(key=lambda x: x[1], reverse=True)
        
        # 5. Return sorted suggestions with weights
        return {
            'suggestions': [
                {**sugg, 'weight': weight} 
                for sugg, weight in weighted_suggestions
            ],
            'query': query,
            'attempts': 0,
            'search_strategy': 'Fast hybrid (parallel + LLM direct)'
        }
    
    return {
        'suggestions': [],
        'query': query,
        'attempts': 0,
        'error': 'No suggestions found'
    }

def get_shortlist(req: ShortlistRequest) -> ShortlistResponse:
    # TODO: Generate queries, call search API, parse, score, dedupe
    # Return ShortlistResponse
    return ShortlistResponse(items=[ShortlistItem(make="Toyota", model="Camry", trim="SE", why="Popular reliable sedan", score=0.9, source_urls=["https://example.com"])])
def llm_suggest_cars(price, min_price, max_price, body_styles, features):
    """
    Ask LLM to directly suggest specific car makes/models based on requirements.
    This bypasses search and gets instant recommendations.
    """
    logger.info("Asking LLM for direct car recommendations...")
    
    body_style_text = ', '.join(body_styles) if body_styles else 'any'
    feature_text = ', '.join(features[:3]) if features else 'reliable, safe'
    
    prompt = f"""You are a car expert. Recommend 15-20 SPECIFIC used car make/model/year combinations for someone with these requirements:

REQUIREMENTS:
- Budget: ${price:,} (strict range: ${min_price:,} to ${max_price:,})
- Body styles preferred: {body_style_text}
- Features: {feature_text}

YOUR TASK:
List 15-20 diverse specific cars (make, model, year) that fit this budget and requirements.
Include a variety of brands and models.
Focus on cars typically available in the ${min_price//1000}k-${max_price//1000}k range.

Return ONLY valid JSON array format:
[
  {{"make": "Honda", "model": "Accord", "year": "2019"}},
  {{"make": "Toyota", "model": "Camry", "year": "2020"}},
  ...
]

NO THINKING. NO EXPLANATION. ONLY JSON ARRAY."""

    try:
        response = llm_chat(prompt, response_format={"type": "json_object"})
        
        if isinstance(response, dict) and 'error' not in response:
            # LLM might return wrapped in object, extract array
            if 'cars' in response:
                cars = response['cars']
            elif 'recommendations' in response:
                cars = response['recommendations']
            else:
                # Assume the dict values contain the array
                cars = list(response.values())[0] if response.values() else []
                
            if isinstance(cars, list):
                suggestions = []
                for car in cars[:20]:
                    if isinstance(car, dict) and all(k in car for k in ['make', 'model', 'year']):
                        suggestions.append({
                            'make': car['make'],
                            'model': car['model'],
                            'year': str(car['year']),
                            'source': 'llm_direct',
                            'url': ''
                        })
                
                logger.info(f"LLM suggested {len(suggestions)} cars directly")
                return suggestions
        
        logger.warning("LLM direct suggestion failed, returning empty")
        return []
        
    except Exception as e:
        logger.error(f"LLM direct suggestion error: {e}")
        return []
