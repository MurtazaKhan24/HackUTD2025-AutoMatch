from flask import Blueprint, request, jsonify
from app.agents.finance_agent import get_financing_options
import logging

financing = Blueprint('financing', __name__)
logger = logging.getLogger(__name__)

@financing.route('/api/financing/local-rates', methods=['POST', 'OPTIONS'])
def get_local_rates():
    """
    Get local financing options from banks and credit unions.
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        zipcode = data.get('zipcode', '75080')
        credit_score = data.get('credit_score', 'good')
        
        logger.info(f"Getting financing options for zipcode: {zipcode}, credit: {credit_score}")
        
        result = get_financing_options(
            zipcode=zipcode,
            credit_score=credit_score
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Failed to get financing options: {e}")
        return jsonify({'error': str(e)}), 500

