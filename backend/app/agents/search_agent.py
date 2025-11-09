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

def enrich_with_review_links(cars: List[Dict]) -> List[Dict]:
    """
    Enrich cars with review links by searching for reviews.
    Uses parallel SerpAPI calls for speed.
    """
    logger.info(f"Enriching {len(cars)} cars with review links...")
    
    def get_review_link(car: Dict) -> Dict:
        """Get a review link for a single car."""
        try:
            year = car.get('year', '')
            make = car.get('make', '')
            model = car.get('model', '')
            
            # Search for professional reviews
            query = f"{year} {make} {model} review edmunds kelley blue book consumer reports"
            
            params = {
                'engine': 'google',
                'q': query,
                'api_key': SERPAPI_KEY,
                'num': 5,
                'gl': 'us'
            }
            
            resp = requests.get('https://serpapi.com/search', params=params, timeout=10)
            resp.raise_for_status()
            results = resp.json()
            
            # Find first review from trusted sources
            trusted_domains = ['edmunds.com', 'kbb.com', 'consumerreports.org', 'caranddriver.com', 'motortrend.com']
            for result in results.get('organic_results', []):
                link = result.get('link', '')
                if any(domain in link.lower() for domain in trusted_domains):
                    car['reviewLink'] = link
                    logger.debug(f"✓ Found review for {year} {make} {model}: {link}")
                    return car
            
            # Fallback to first result if no trusted source found
            if results.get('organic_results'):
                car['reviewLink'] = results['organic_results'][0].get('link', '')
                logger.debug(f"✓ Found review (fallback) for {year} {make} {model}")
            else:
                logger.debug(f"✗ No review found for {year} {make} {model}")
                
        except Exception as e:
            logger.warning(f"Failed to get review link for {car.get('year')} {car.get('make')} {car.get('model')}: {e}")
        
        return car
    
    # Run in parallel for speed
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        enriched_cars = list(executor.map(get_review_link, cars))
    
    num_with_links = sum(1 for car in enriched_cars if car.get('reviewLink'))
    logger.info(f"Review link enrichment complete: {num_with_links}/{len(cars)} cars have review links")
    
    return enriched_cars

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
}}"""

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
        
        # FALLBACK: Aggressive rule-based logic if LLM fails - with PRICE RANGE
        # NO HARDCODED MODELS - keep it open-ended
        current_count = len(state.get('suggestions', []))
        price = int(state.get('price', 20000))
        min_price = state.get('min_price', int(price * 0.7))
        max_price = state.get('max_price', int(price * 1.0))
        price_range = f"${min_price//1000}k to ${max_price//1000}k"
        body_styles = state.get('body_styles', ['car'])
        
        if current_count == 0 and state.get('attempts', 0) > 0:
            # No results, cast a very wide net
            new_state['query'] = f"best reliable used cars price {price_range}"
            logger.info(f"Fallback: No results, broadening heavily: {new_state['query']}")
        elif current_count < 5:
            # Few results, search for popular sedans
            new_state['query'] = f"popular reliable sedan price {price_range}"
            logger.info(f"Fallback: Few results, searching popular sedans: {new_state['query']}")
        elif current_count < 10:
            # Moderate results, try SUVs or alternative body styles
            new_state['query'] = f"reliable SUV crossover price {price_range}"
            logger.info(f"Fallback: Searching SUVs: {new_state['query']}")
        else:
            # Good number of results, search for value picks
            new_state['query'] = f"value reliable used cars price {price_range}"
            logger.info(f"Fallback: Searching value picks: {new_state['query']}")
        
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
            
            # Generate a complementary query based on budget - with PRICE RANGE
            # NO HARDCODED MODELS - let search be open-ended
            price = state.get('price', 20000)
            min_price = state.get('min_price', int(price * 0.7))
            max_price = state.get('max_price', int(price * 1.0))
            price_range = f"${min_price//1000}k to ${max_price//1000}k"
            
            # Generic boost queries without specific models
            if price >= 50000:
                boost_query = f"luxury SUV crossover reliable price {price_range}"
            elif price >= 35000:
                boost_query = f"midsize SUV crossover reliable price {price_range}"
            elif price >= 20000:
                boost_query = f"compact SUV crossover reliable price {price_range}"
            else:
                boost_query = f"economical hatchback sedan reliable price {price_range}"
            
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

def parallel_search_cars(query, min_price, max_price, body_styles=None, features=None, num_queries=3):
    """
    Run multiple diverse search queries in parallel for faster results.
    Returns combined suggestions from all queries.
    """
    import time
    start_time = time.time()
    logger.info(f"{num_queries} queries will run concurrently")
    
    price_range = f"${min_price//1000}k to ${max_price//1000}k"
    
    # Define preferred sites for higher quality results
    preferred_sites = [
        "caranddriver.com", 
        "edmunds.com", 
        "motortrend.com", 
        "reddit.com/r/whatcarshouldibuy"
    ]

    # Build body style filter
    if body_styles and body_styles != ['any']:
        body_filter = ' '.join(body_styles)
        logger.info(f"Body style filter: {body_filter}")
    else:
        body_filter = None
        logger.info("No body style filter - searching all types")
    
    # Generate diverse query variations based on preferences
    queries = []
    base_query = query # Use the intelligently crafted query from get_car_suggestions
    
    # 1. Add a general query
    queries.append(base_query)
    
    # 2. Add site-specific queries for higher quality results
    for site in preferred_sites:
        queries.append(f"{base_query} site:{site}")

    # Limit to num_queries, prioritizing site-specific ones
    queries = queries[:num_queries]
    
    logger.info(f"Generated {len(queries)} parallel queries: {queries}")
    
    all_suggestions = []
    
    def search_single_query(q):
        """Search a single query via SerpAPI."""
        query_start = time.time()
        logger.info(f"Thread starting SerpAPI call for: '{q}'")
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
            
            query_elapsed = time.time() - query_start
            logger.info(f"Query '{q[:50]}...' completed in {query_elapsed:.2f}s, found {len(suggestions)} suggestions")
            return suggestions
            
        except Exception as e:
            query_elapsed = time.time() - query_start
            logger.error(f"Parallel search failed for '{q}' after {query_elapsed:.2f}s: {e}")
            return []
    
    # Run searches in parallel using ThreadPoolExecutor
    logger.info(f"Submitting {len(queries)} queries to ThreadPoolExecutor...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_queries) as executor:
        future_to_query = {executor.submit(search_single_query, q): q for q in queries}
        completed_count = 0
        for future in concurrent.futures.as_completed(future_to_query):
            completed_count += 1
            query = future_to_query[future]
            logger.info(f"Query {completed_count}/{len(queries)} completed: '{query[:50]}'")
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
    
    elapsed_time = time.time() - start_time
    logger.info(f"PARALLEL SEARCH COMPLETE in {elapsed_time:.2f}s: {len(unique_suggestions)} unique suggestions from {len(all_suggestions)} total")
    logger.info(f"Throughput: {len(unique_suggestions)/elapsed_time:.1f} unique cars/second")
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
    
    logger.info(f"========================================")
    logger.info(f"USER PREFERENCES RECEIVED:")
    logger.info(f"  Body Types: {body_types}")
    logger.info(f"  Budget: ${data.get('budget') or data.get('price', 20000):,}")
    logger.info(f"========================================")
    
    # Extract features - handle both string and object formats
    features_raw = data.get('features', [])
    features = []
    for f in features_raw:
        if isinstance(f, dict):
            features.append(f.get('label', ''))
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
    # NO hardcoded models - make it open-ended for maximum diversity
    if price >= 80000:
        price_desc = "luxury premium"
    elif price >= 50000:
        price_desc = "upscale premium"
    elif price >= 35000:
        price_desc = "mid-range quality"
    elif price >= 20000:
        price_desc = "affordable reliable"
    else:
        price_desc = "budget economical"
    
    # Build open-ended query - let the LLM discover cars autonomously
    body_style_text = ' '.join(body_types) if body_types else 'car'
    feature_text = ' '.join(features[:2]) if features else 'reliable'
    query = f"best {price_desc} {body_style_text} {feature_text} used cars price {price_range}"
    
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
    logger.info("=" * 80)
    logger.info("FAST HYBRID APPROACH ACTIVATED")
    logger.info("=" * 80)
    logger.info("Strategy: Parallel SerpAPI searches (4 queries) + LLM direct suggestions")
    logger.info("Expected: Results in 2-5 seconds vs 30+ seconds for sequential")
    
    import time
    hybrid_start = time.time()
    
    all_suggestions = []
    
    # Method 1: Get direct LLM recommendations (instant)
    llm_start = time.time()
    logger.info("Method 1: Requesting direct LLM car recommendations...")
    llm_suggestions = llm_suggest_cars(price, min_price, max_price, body_types, features)
    llm_elapsed = time.time() - llm_start
    all_suggestions.extend(llm_suggestions)
    logger.info(f"LLM direct: {len(llm_suggestions)} suggestions in {llm_elapsed:.2f}s")
    
    # Method 2: Run parallel diverse searches (fast)
    parallel_start = time.time()
    logger.info("Method 2: Starting parallel SerpAPI searches...")
    parallel_suggestions = parallel_search_cars(query, min_price, max_price, body_styles=body_types, features=features, num_queries=4)
    parallel_elapsed = time.time() - parallel_start
    all_suggestions.extend(parallel_suggestions)
    logger.info(f"Parallel search: {len(parallel_suggestions)} suggestions in {parallel_elapsed:.2f}s")
    
    # Deduplicate combined results
    dedup_start = time.time()
    seen_models = set()
    unique_suggestions = []
    for sugg in all_suggestions:
        model_key = f"{sugg.get('make', '').lower()}_{sugg.get('model', '').lower()}_{sugg.get('year', '')}"
        if model_key not in seen_models:
            seen_models.add(model_key)
            unique_suggestions.append(sugg)
    dedup_elapsed = time.time() - dedup_start
    
    hybrid_elapsed = time.time() - hybrid_start
    logger.info(f"Deduplication: {len(all_suggestions)} → {len(unique_suggestions)} unique in {dedup_elapsed:.2f}s")
    logger.info(f"TOTAL HYBRID TIME: {hybrid_elapsed:.2f}s")
    logger.info(f"Final result: {len(unique_suggestions)} unique cars ready for ranking")
    logger.info("=" * 80)
    
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
        
        # 3. Enrich with review links (Agent Research)
        logger.info("Step 3: Enriching cars with review links for Agent Research...")
        suggestions = enrich_with_review_links(suggestions)
        
        # 4. Calculate weights
        weights = prefs.get_preference_weights(suggestions)
        
        # 5. Sort suggestions by weight
        weighted_suggestions = list(zip(suggestions, weights))
        weighted_suggestions.sort(key=lambda x: x[1], reverse=True)
        
        # 6. Return sorted suggestions with weights and review links
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
    
    # Build strict body style requirement
    if body_styles and body_styles != ['any']:
        body_requirement = f"ONLY {body_style_text} body style(s). DO NOT suggest sedans, SUVs, trucks, or any other body styles."
    else:
        body_requirement = "Any body style is acceptable."
    
    prompt = f"""You are a car expert. Recommend 15-20 SPECIFIC used car make/model/year combinations.

STRICT REQUIREMENTS (YOU MUST FOLLOW THESE):
1. Price: Cars must typically sell for ${min_price:,} to ${max_price:,} (budget: ${price:,})
2. Body Style: {body_requirement}
3. Desired features: {feature_text}

CRITICAL INSTRUCTIONS:
- {body_requirement}
- Every car MUST be available in the ${min_price//1000}k-${max_price//1000}k price range
- Provide 15-20 diverse makes and models
- Include variety: different brands, luxury and non-luxury, sporty and practical
- Focus on cars commonly available used in 2018-2024 model years

Return ONLY valid JSON array format:
[
  {{"make": "Honda", "model": "Accord", "year": "2019"}},
  {{"make": "Toyota", "model": "Camry", "year": "2020"}},
  ...
]"""

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
