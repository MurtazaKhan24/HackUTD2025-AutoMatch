from flask import Blueprint, request, jsonify
from app.schemas import ListingsRequest, ListingsResponse
from app.agents.listings_agent import get_listings

listings_bp = Blueprint('listings', __name__)

@listings_bp.route('/search', methods=['POST'])
def listings_search():
    data = request.get_json()
    try:
        req = ListingsRequest(**data)
        result = get_listings(req)
        return jsonify(result.dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 400
