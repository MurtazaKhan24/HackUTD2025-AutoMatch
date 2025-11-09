from flask import Blueprint, request, jsonify
from app.models.preferences import CarPreferences
import os
import json
import logging

logger = logging.getLogger(__name__)

# Initialize Blueprint
swipe = Blueprint('swipe', __name__)

# Initialize preferences
preferences = CarPreferences()
PREFERENCES_FILE = 'data/preferences.json'

# Ensure data directory exists
os.makedirs('data', exist_ok=True)

# Load existing preferences if any
if os.path.exists(PREFERENCES_FILE):
    preferences.load(PREFERENCES_FILE)

@swipe.route('/api/swipe', methods=['POST'])
def handle_swipe():
    """Handle a swipe interaction."""
    try:
        data = request.json
        car = data.get('car')
        liked = data.get('liked', False)
        
        if not car or not isinstance(car, dict):
            return jsonify({'error': 'Invalid car data'}), 400
            
        # Update preferences
        preferences.update_from_interaction(car, liked)
        
        # Save preferences
        preferences.save(PREFERENCES_FILE)
        
        # Return next batch of suggestions if needed
        return jsonify({
            'success': True,
            'preferences': preferences.preferences
        })
        
    except Exception as e:
        logger.error(f"Error handling swipe: {e}")
        return jsonify({'error': str(e)}), 500
