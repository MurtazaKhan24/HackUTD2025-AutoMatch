from flask import Blueprint, request, jsonify
from app.agents.insurance_agent import get_insurance_options
import logging

insurance = Blueprint('insurance', __name__)
logger = logging.getLogger(__name__)

@insurance.route('/api/insurance/local-quotes', methods=['POST', 'OPTIONS'])
def get_local_quotes():
    """
    Get local insurance quotes and providers.
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        zipcode = data.get('zipcode', '75080')
        car_details = data.get('car_details', 'sedan')
        driver_age = data.get('driver_age', 30)
        
        logger.info(f"Getting insurance quotes for zipcode: {zipcode}, car: {car_details}")
        
        result = get_insurance_options(
            zipcode=zipcode,
            car_details=car_details,
            driver_age=driver_age
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Failed to get insurance quotes: {e}")
        return jsonify({'error': str(e)}), 500
