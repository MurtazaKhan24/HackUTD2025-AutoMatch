from app.llm_client import llm_chat
import requests
from app.config import SERPAPI_KEY
import logging
import re
import concurrent.futures
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def search_local_inspectors(zipcode: str = "75080", car_type: str = "sedan") -> Dict[str, Any]:
    """
    Search for local mechanics and inspection services for pre-purchase inspections.
    Uses AI agent to find, extract, and summarize inspection options.
    
    Args:
        zipcode: User's zipcode for local search
        car_type: Type of car being inspected (sedan, suv, truck, etc.)
    
    Returns:
        Dictionary with inspection options and summary
    """
    logger.info(f"Starting inspection search for zipcode: {zipcode}, car type: {car_type}")
    
    # Step 1: Search for local mechanics and inspection services
    inspection_options = []
    
    # Generate search queries
    queries = [
        f"pre purchase car inspection near {zipcode}",
        f"mobile mechanic inspection {zipcode}",
        f"automotive inspection service {zipcode}",
        f"certified mechanic pre-purchase inspection {zipcode}"
    ]
    
    def search_single_query(query: str) -> List[Dict]:
        """Search a single query for inspection services."""
        logger.info(f"Searching: {query}")
        try:
            params = {
                'engine': 'google',
                'q': query,
                'api_key': SERPAPI_KEY,
                'num': 10,
                'gl': 'us'
            }
            
            resp = requests.get('https://serpapi.com/search', params=params, timeout=30)
            resp.raise_for_status()
            results = resp.json()
            
            options = []
            for result in results.get('organic_results', []):
                title = result.get('title', '')
                snippet = result.get('snippet', '')
                link = result.get('link', '')
                
                # Look for price patterns in snippet
                text = f"{title} {snippet}"
                price = None
                
                # Extract price patterns
                price_patterns = [
                    r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)',
                    r'(\d+)\s*dollars?',
                ]
                
                for pattern in price_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        try:
                            price_str = match.group(1).replace(',', '')
                            price_float = float(price_str)
                            if 50 < price_float < 500:  # Reasonable inspection price range
                                price = price_float
                                break
                        except ValueError:
                            continue
                
                # Look for ratings
                rating = None
                rating_match = re.search(r'(\d+\.?\d*)\s*(?:stars?|rating|\/5)', text, re.IGNORECASE)
                if rating_match:
                    try:
                        rating = float(rating_match.group(1))
                        if rating > 5:  # Normalize if out of 5
                            rating = rating / 10 * 5
                    except ValueError:
                        pass
                
                # Extract phone number if available
                phone = None
                phone_match = re.search(r'(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})', text)
                if phone_match:
                    phone = phone_match.group(1)
                
                options.append({
                    'name': title.split('|')[0].split('-')[0].strip(),
                    'snippet': snippet[:200],
                    'link': link,
                    'price': price,
                    'rating': rating,
                    'phone': phone,
                    'source': 'web_search'
                })
            
            logger.info(f"Found {len(options)} inspection options from query: {query}")
            return options
            
        except Exception as e:
            logger.error(f"Search failed for '{query}': {e}")
            return []
    
    # Run searches in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(search_single_query, queries))
    
    # Flatten results and deduplicate
    for result_list in results:
        inspection_options.extend(result_list)
    
    # Deduplicate by name
    seen_names = set()
    unique_options = []
    for option in inspection_options:
        name_lower = option['name'].lower()
        if name_lower not in seen_names and len(name_lower) > 3:
            seen_names.add(name_lower)
            unique_options.append(option)
    
    inspection_options = unique_options[:8]  # Keep top 8
    
    logger.info(f"Found {len(inspection_options)} unique inspection options")
    
    # Step 2: Use LLM to analyze and summarize options
    if inspection_options:
        # Prepare data for LLM
        options_text = "\n".join([
            f"- {opt['name']}: {opt['snippet'][:100]}" + 
            (f" (${opt['price']})" if opt['price'] else "") +
            (f" ({opt['rating']}/5 rating)" if opt['rating'] else "")
            for opt in inspection_options
        ])
        
        prompt = f"""You are an automotive advisor helping someone find a pre-purchase inspection service.

USER CONTEXT:
- Location: Zipcode {zipcode}
- Car Type: {car_type}

INSPECTION SERVICES FOUND:
{options_text}

TASK:
Analyze these inspection services and provide:
1. A brief summary of available options
2. What to look for in a quality inspection service
3. Typical price range and recommendations

Keep your response concise (2-3 sentences max).

Return ONLY valid JSON:
{{
    "summary": "your summary here",
    "typical_price_range": "price range as string",
    "recommendation": "your recommendation here"
}}"""

        try:
            llm_response = llm_chat(prompt, response_format={"type": "json_object"})
            
            if isinstance(llm_response, dict) and 'error' not in llm_response:
                summary_data = llm_response
            else:
                summary_data = {
                    "summary": "Found multiple local inspection services.",
                    "typical_price_range": "$100-$200",
                    "recommendation": "Choose a certified mechanic with good reviews and transparent pricing."
                }
        except Exception as e:
            logger.error(f"LLM summary failed: {e}")
            summary_data = {
                "summary": "Found multiple local inspection services.",
                "typical_price_range": "$100-$200",
                "recommendation": "Choose a certified mechanic with good reviews."
            }
    else:
        summary_data = {
            "summary": "No specific inspection services found. Try searching local ASE-certified mechanics.",
            "typical_price_range": "$100-$200",
            "recommendation": "Contact local mechanics directly for pre-purchase inspection quotes."
        }
    
    return {
        'options': inspection_options,
        'summary': summary_data.get('summary', ''),
        'typical_price_range': summary_data.get('typical_price_range', '$100-$200'),
        'recommendation': summary_data.get('recommendation', ''),
        'zipcode': zipcode
    }


def get_inspection_options(zipcode: str = "75080", car_type: str = "sedan") -> Dict[str, Any]:
    """
    Main function to get inspection options for a user.
    
    Args:
        zipcode: User's zipcode
        car_type: Type of car being inspected
        
    Returns:
        Dictionary with inspection options and AI summary
    """
    try:
        return search_local_inspectors(zipcode, car_type)
    except Exception as e:
        logger.error(f"Failed to get inspection options: {e}")
        return {
            'options': [],
            'summary': 'Unable to fetch inspection options at this time.',
            'typical_price_range': '$100-$200',
            'recommendation': 'Please search for local ASE-certified mechanics directly.',
            'zipcode': zipcode,
            'error': str(e)
        }
