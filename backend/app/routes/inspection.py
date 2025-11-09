from flask import Blueprint, request, jsonify
from app.agents.inspection_agent import get_inspection_options
import logging

inspection = Blueprint('inspection', __name__)
logger = logging.getLogger(__name__)

@inspection.route('/api/inspection/local-services', methods=['POST', 'OPTIONS'])
def get_local_services():
    """
    Get local pre-purchase inspection services.
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        zipcode = data.get('zipcode', '75080')
        car_type = data.get('car_type', 'sedan')
        
        logger.info(f"Getting inspection services for zipcode: {zipcode}, car type: {car_type}")
        
        result = get_inspection_options(
            zipcode=zipcode,
            car_type=car_type
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Failed to get inspection services: {e}")
        return jsonify({'error': str(e)}), 500
