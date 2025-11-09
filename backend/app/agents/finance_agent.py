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

def search_local_financing(zipcode: str = "75080", credit_score: str = "good") -> Dict[str, Any]:
    """
    Search for local banks and credit unions with auto loan rates.
    Uses AI agent to find, extract, and summarize financing options.
    
    Args:
        zipcode: User's zipcode for local search
        credit_score: User's credit score range (excellent, good, fair, poor)
    
    Returns:
        Dictionary with financing options and summary
    """
    logger.info(f"Starting finance search for zipcode: {zipcode}, credit: {credit_score}")
    
    # Step 1: Search for local banks and credit unions
    financing_options = []
    
    # Generate search queries
    queries = [
        f"auto loan rates near {zipcode}",
        f"credit union auto loan rates {zipcode}",
        f"best car loan rates {zipcode}",
        f"local bank auto financing {zipcode}"
    ]
    
    def search_single_query(query: str) -> List[Dict]:
        """Search a single query for financing options."""
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
                
                # Look for interest rates in title or snippet
                text = f"{title} {snippet}"
                
                # Extract APR/rate patterns
                rate_patterns = [
                    r'(\d+\.?\d*)\s*%?\s*APR',
                    r'(\d+\.?\d*)\s*%\s*rate',
                    r'rates?\s+(?:as\s+low\s+as\s+)?(\d+\.?\d*)\s*%',
                    r'(\d+\.?\d*)\s*%\s+(?:interest|financing)',
                ]
                
                for pattern in rate_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        rate = match.group(1)
                        # Filter out unrealistic rates
                        try:
                            rate_float = float(rate)
                            if 0 < rate_float < 30:  # Reasonable auto loan range
                                options.append({
                                    'institution': title.split('|')[0].split('-')[0].strip(),
                                    'rate': rate_float,
                                    'snippet': snippet[:200],
                                    'link': link,
                                    'source': 'web_search'
                                })
                                break
                        except ValueError:
                            continue
            
            logger.info(f"Found {len(options)} financing options from query: {query}")
            return options
            
        except Exception as e:
            logger.error(f"Search failed for '{query}': {e}")
            return []
    
    # Run searches in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(search_single_query, queries))
    
    # Flatten results and deduplicate
    for result_list in results:
        financing_options.extend(result_list)
    
    # Deduplicate by institution name
    seen_institutions = set()
    unique_options = []
    for option in financing_options:
        inst_lower = option['institution'].lower()
        if inst_lower not in seen_institutions:
            seen_institutions.add(inst_lower)
            unique_options.append(option)
    
    financing_options = unique_options[:10]  # Keep top 10
    
    logger.info(f"Found {len(financing_options)} unique financing options")
    
    # Step 2: Use LLM to analyze and summarize options
    if financing_options:
        # Prepare data for LLM
        options_text = "\n".join([
            f"- {opt['institution']}: {opt['rate']}% APR - {opt['snippet'][:100]}"
            for opt in financing_options
        ])
        
        prompt = f"""You are a financial advisor helping someone find the best auto loan rates.

USER CONTEXT:
- Location: Zipcode {zipcode}
- Credit Score Range: {credit_score}

FINANCING OPTIONS FOUND:
{options_text}

TASK:
Analyze these financing options and provide:
1. A brief summary of the best rates available
2. Recommendations based on the user's credit score
3. Key considerations (e.g., credit unions vs banks, local vs national)

Keep your response concise (2-3 sentences max).

Return ONLY valid JSON:
{{
    "summary": "your summary here",
    "best_rate": lowest_rate_found,
    "recommendation": "your recommendation here"
}}"""

        try:
            llm_response = llm_chat(prompt, response_format={"type": "json_object"})
            
            if isinstance(llm_response, dict) and 'error' not in llm_response:
                summary_data = llm_response
            else:
                summary_data = {
                    "summary": "Found multiple local financing options.",
                    "best_rate": min([opt['rate'] for opt in financing_options]),
                    "recommendation": "Compare rates from local credit unions for potentially better terms."
                }
        except Exception as e:
            logger.error(f"LLM summary failed: {e}")
            summary_data = {
                "summary": "Found multiple local financing options.",
                "best_rate": min([opt['rate'] for opt in financing_options]) if financing_options else None,
                "recommendation": "Review options below and compare terms."
            }
    else:
        summary_data = {
            "summary": "No specific rates found. Check with local banks directly.",
            "best_rate": None,
            "recommendation": "Contact local credit unions and banks for personalized quotes."
        }
    
    return {
        'options': financing_options,
        'summary': summary_data.get('summary', ''),
        'best_rate': summary_data.get('best_rate'),
        'recommendation': summary_data.get('recommendation', ''),
        'zipcode': zipcode
    }


def get_financing_options(zipcode: str = "75080", credit_score: str = "good") -> Dict[str, Any]:
    """
    Main function to get financing options for a user.
    
    Args:
        zipcode: User's zipcode
        credit_score: User's credit score range
        
    Returns:
        Dictionary with financing options and AI summary
    """
    try:
        return search_local_financing(zipcode, credit_score)
    except Exception as e:
        logger.error(f"Failed to get financing options: {e}")
        return {
            'options': [],
            'summary': 'Unable to fetch financing options at this time.',
            'best_rate': None,
            'recommendation': 'Please check with local banks and credit unions directly.',
            'zipcode': zipcode,
            'error': str(e)
        }
