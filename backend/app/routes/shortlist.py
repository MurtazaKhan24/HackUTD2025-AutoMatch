from flask import Blueprint, request, jsonify
from app.schemas import ShortlistRequest, ShortlistResponse
from app.agents.search_agent import get_shortlist

shortlist_bp = Blueprint('shortlist', __name__)

@shortlist_bp.route('/shortlist', methods=['POST'])
def shortlist():
    data = request.get_json()
    try:
        req = ShortlistRequest(**data)
        result = get_shortlist(req)
        return jsonify(result.dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 400
