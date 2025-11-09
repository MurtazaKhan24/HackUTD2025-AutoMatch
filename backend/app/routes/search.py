from flask import Blueprint, request, jsonify
from app.agents.search_agent import get_car_suggestions
from app.services.auto_dev import AutoDevService
import asyncio
import logging

logger = logging.getLogger(__name__)
search = Blueprint('search', __name__)

def is_car_complete(car: dict) -> bool:
    """Check if a car has sufficient data to be useful to the user."""
    # Critical fields that must be present
    critical_fields = ['make', 'model', 'year']
    for field in critical_fields:
        if not car.get(field):
            logger.info(f"✗ Missing critical field: {field}")
            return False
    
    # Count important fields that have meaningful values
    important_fields_present = 0
    total_important_fields = 0
    
    # Price
    total_important_fields += 1
    price = car.get('price', {}).get('marketValue')
    if price and price > 0:
        important_fields_present += 1
    else:
        logger.info(f"  - Missing price")
    
    # Photos
    total_important_fields += 1
    photos = car.get('photos', [])
    if photos and len(photos) > 0:
        important_fields_present += 1
    else:
        logger.info(f"  - Missing photos")
    
    # Specs (at least some specs should be present)
    total_important_fields += 1
    specs = car.get('specs', {})
    if specs:
        spec_values = [v for v in specs.values() if v and v != 'N/A' and v != 'None']
        if len(spec_values) >= 2:  # At least 2 specs
            important_fields_present += 1
        else:
            logger.info(f"  - Insufficient specs ({len(spec_values)} present)")
    else:
        logger.info(f"  - No specs")
    
    # VIN or location (at least one for provenance)
    total_important_fields += 1
    if car.get('vin') or car.get('location'):
        important_fields_present += 1
    else:
        logger.info(f"  - No VIN or location")
    
    # Must have at least 75% of important fields (3 out of 4)
    completeness_ratio = important_fields_present / total_important_fields
    is_complete = completeness_ratio >= 0.75
    
    logger.info(f"{'✓' if is_complete else '✗'} Completeness: {important_fields_present}/{total_important_fields} ({completeness_ratio:.0%}) - {car.get('year')} {car.get('make')} {car.get('model')}")
    
    return is_complete

@search.route('/api/search/suggestions', methods=['POST', 'OPTIONS'])
def car_suggestions():
    """Get car suggestions based on user preferences."""
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        logger.info("=== /api/search/suggestions endpoint called ===")
        logger.info(f"Request method: {request.method}")
        logger.info(f"Request headers: {dict(request.headers)}")
        logger.info(f"Request origin: {request.headers.get('Origin')}")
        
        data = request.json
        logger.info(f"Request data: {data}")
        
        # Get initial suggestions from search agent
        logger.info("Calling get_car_suggestions...")
        result = get_car_suggestions(data)
        logger.info(f"get_car_suggestions returned: {result}")
        
        if result.get('error'):
            logger.error(f"Search agent returned error: {result.get('error')}")
            return jsonify(result), 500
            
        suggestions = result.get('suggestions', [])
        logger.info(f"Got {len(suggestions)} suggestions from search agent")
        
        # Enrich suggestions with auto.dev data
        if suggestions:
            logger.info("Enriching suggestions with auto.dev...")
            auto_dev = AutoDevService()
            # Run async enrichment synchronously
            enriched_suggestions = asyncio.run(auto_dev.enrich_car_list(suggestions))
            
            # Filter by data completeness FIRST (before price filtering)
            logger.info(f"=== Filtering by data completeness ===")
            complete_suggestions = []
            for sugg in enriched_suggestions:
                if is_car_complete(sugg):
                    complete_suggestions.append(sugg)
            
            logger.info(f"After completeness filtering: {len(complete_suggestions)}/{len(enriched_suggestions)} suggestions")
            
            # If completeness filtering removed all results, keep top 3 from original
            if len(complete_suggestions) == 0 and len(enriched_suggestions) > 0:
                logger.warning("Completeness filter removed all results, keeping top 3 original suggestions")
                complete_suggestions = enriched_suggestions[:3]
            else:
                enriched_suggestions = complete_suggestions
            
            # Price filtering REMOVED - let users see all options and decide themselves
            # The agent already prioritizes cars in the budget range via search queries
            # but doesn't hard-filter to avoid removing good options
            
            result['suggestions'] = enriched_suggestions
            logger.info(f"Enrichment complete, returning {len(enriched_suggestions)} suggestions")
        
        logger.info("=== Request completed successfully ===")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
