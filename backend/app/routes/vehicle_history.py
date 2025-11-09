from flask import Blueprint, request, jsonify
from app.agents.vehicle_history_agent import get_vehicle_history, decode_vin
import logging

vehicle_history = Blueprint('vehicle_history', __name__)
logger = logging.getLogger(__name__)

@vehicle_history.route('/api/vehicle-history/report', methods=['POST', 'OPTIONS'])
def get_history_report():
    """
    Get vehicle history including recalls and complaints.
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        vin = data.get('vin')
        year = data.get('year')
        make = data.get('make')
        model = data.get('model')
        
        logger.info(f"Getting vehicle history for: {year} {make} {model} (VIN: {vin})")
        
        result = get_vehicle_history(
            vin=vin,
            year=str(year) if year else None,
            make=make,
            model=model
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Failed to get vehicle history: {e}")
        return jsonify({'error': str(e)}), 500


@vehicle_history.route('/api/vehicle-history/decode-vin', methods=['POST', 'OPTIONS'])
def decode_vehicle_vin():
    """
    Decode a VIN to get vehicle information.
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        vin = data.get('vin')
        
        if not vin:
            return jsonify({'error': 'VIN is required'}), 400
        
        logger.info(f"Decoding VIN: {vin}")
        
        result = decode_vin(vin)
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Failed to decode VIN: {e}")
        return jsonify({'error': str(e)}), 500
