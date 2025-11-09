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

def search_local_insurance(zipcode: str = "75080", car_details: str = "sedan", driver_age: int = 30) -> Dict[str, Any]:
    """
    Search for local insurance companies and agents with auto insurance quotes.
    Uses AI agent to find, extract, and summarize insurance options.
    
    Args:
        zipcode: User's zipcode for local search
        car_details: Car type and year for insurance quote
        driver_age: Driver's age for more accurate quotes
    
    Returns:
        Dictionary with insurance options and summary
    """
    logger.info(f"Starting insurance search for zipcode: {zipcode}, car: {car_details}")
    
    # Step 1: Search for local insurance companies and agents
    insurance_options = []
    
    # Generate search queries
    queries = [
        f"auto insurance quotes {zipcode}",
        f"car insurance agents near {zipcode}",
        f"cheap car insurance {zipcode}",
        f"local insurance companies {zipcode}"
    ]
    
    def search_single_query(query: str) -> List[Dict]:
        """Search a single query for insurance providers."""
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
                
                # Look for pricing in title or snippet
                text = f"{title} {snippet}"
                
                # Extract price/rate patterns
                monthly_rate = None
                rate_patterns = [
                    r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per month|/mo|monthly)',
                    r'(?:as low as|starting at)\s*\$(\d+(?:,\d{3})*(?:\.\d{2})?)',
                ]
                
                for pattern in rate_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        try:
                            rate_str = match.group(1).replace(',', '')
                            rate_float = float(rate_str)
                            if 30 < rate_float < 500:  # Reasonable monthly insurance range
                                monthly_rate = rate_float
                                break
                        except ValueError:
                            continue
                
                # Look for ratings
                rating = None
                rating_match = re.search(r'(\d+\.?\d*)\s*(?:stars?|rating|\/5)', text, re.IGNORECASE)
                if rating_match:
                    try:
                        rating = float(rating_match.group(1))
                        if rating > 5:
                            rating = rating / 10 * 5
                    except ValueError:
                        pass
                
                # Extract phone number if available
                phone = None
                phone_match = re.search(r'(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})', text)
                if phone_match:
                    phone = phone_match.group(1)
                
                # Filter for actual insurance providers
                insurance_keywords = ['insurance', 'allstate', 'geico', 'progressive', 'state farm', 
                                     'liberty', 'farmers', 'usaa', 'nationwide', 'travelers']
                if any(keyword in title.lower() for keyword in insurance_keywords):
                    options.append({
                        'provider': title.split('|')[0].split('-')[0].strip(),
                        'snippet': snippet[:200],
                        'link': link,
                        'monthly_rate': monthly_rate,
                        'rating': rating,
                        'phone': phone,
                        'source': 'web_search'
                    })
            
            logger.info(f"Found {len(options)} insurance options from query: {query}")
            return options
            
        except Exception as e:
            logger.error(f"Search failed for '{query}': {e}")
            return []
    
    # Run searches in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(search_single_query, queries))
    
    # Flatten results and deduplicate
    for result_list in results:
        insurance_options.extend(result_list)
    
    # Deduplicate by provider name
    seen_providers = set()
    unique_options = []
    for option in insurance_options:
        provider_lower = option['provider'].lower()
        if provider_lower not in seen_providers and len(provider_lower) > 3:
            seen_providers.add(provider_lower)
            unique_options.append(option)
    
    insurance_options = unique_options[:10]  # Keep top 10
    
    logger.info(f"Found {len(insurance_options)} unique insurance options")
    
    # Step 2: Use LLM to analyze and summarize options
    if insurance_options:
        # Prepare data for LLM
        options_text = "\n".join([
            f"- {opt['provider']}: {opt['snippet'][:100]}" + 
            (f" (${opt['monthly_rate']}/mo)" if opt['monthly_rate'] else "") +
            (f" ({opt['rating']}/5 rating)" if opt['rating'] else "")
            for opt in insurance_options
        ])
        
        prompt = f"""You are an insurance advisor helping someone find auto insurance.

USER CONTEXT:
- Location: Zipcode {zipcode}
- Vehicle: {car_details}
- Driver Age: {driver_age}

INSURANCE PROVIDERS FOUND:
{options_text}

TASK:
Analyze these insurance options and provide:
1. A brief summary of available providers
2. What factors affect insurance rates
3. Tips for getting the best rate

Keep your response concise (2-3 sentences max).

Return ONLY valid JSON:
{{
    "summary": "your summary here",
    "rate_factors": "key factors affecting rates",
    "recommendation": "your recommendation here"
}}"""

        try:
            llm_response = llm_chat(prompt, response_format={"type": "json_object"})
            
            if isinstance(llm_response, dict) and 'error' not in llm_response:
                summary_data = llm_response
            else:
                summary_data = {
                    "summary": "Found multiple insurance providers in your area.",
                    "rate_factors": "Age, driving history, credit score, and vehicle type affect rates.",
                    "recommendation": "Compare quotes from at least 3 providers to find the best rate."
                }
        except Exception as e:
            logger.error(f"LLM summary failed: {e}")
            summary_data = {
                "summary": "Found multiple insurance providers in your area.",
                "rate_factors": "Age, driving history, and vehicle type affect rates.",
                "recommendation": "Get quotes from multiple providers for best rates."
            }
    else:
        summary_data = {
            "summary": "No specific insurance options found. Try major providers like Geico, Progressive, or State Farm.",
            "rate_factors": "Age, driving history, credit score, and vehicle type affect rates.",
            "recommendation": "Contact multiple insurance companies directly for personalized quotes."
        }
    
    return {
        'options': insurance_options,
        'summary': summary_data.get('summary', ''),
        'rate_factors': summary_data.get('rate_factors', ''),
        'recommendation': summary_data.get('recommendation', ''),
        'zipcode': zipcode
    }


def get_insurance_options(zipcode: str = "75080", car_details: str = "sedan", driver_age: int = 30) -> Dict[str, Any]:
    """
    Main function to get insurance options for a user.
    
    Args:
        zipcode: User's zipcode
        car_details: Car details for quote
        driver_age: Driver's age
        
    Returns:
        Dictionary with insurance options and AI summary
    """
    try:
        return search_local_insurance(zipcode, car_details, driver_age)
    except Exception as e:
        logger.error(f"Failed to get insurance options: {e}")
        return {
            'options': [],
            'summary': 'Unable to fetch insurance options at this time.',
            'rate_factors': 'Age, driving history, and vehicle type affect rates.',
            'recommendation': 'Please contact insurance companies directly for quotes.',
            'zipcode': zipcode,
            'error': str(e)
        }
