from flask import Blueprint, request, jsonify
from app.schemas import PriceRequest, PriceResponse
from app.agents.price_agent import get_target_listing_price

price_bp = Blueprint('price', __name__)

@price_bp.route('/target', methods=['POST'])
def price_target():
    data = request.get_json()
    try:
        req = PriceRequest(**data)
        result = get_target_listing_price(req)
        return jsonify(result.dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 400
