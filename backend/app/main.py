from flask import Flask, request
from flask_cors import CORS
from app.routes.price import price_bp
from app.routes.shortlist import shortlist_bp
from app.routes.listings import listings_bp
from app.routes.search import search
from app.routes.swipe import swipe
from app.routes.financing import financing
from app.routes.inspection import inspection
from app.routes.insurance import insurance
from app.routes.vehicle_history import vehicle_history
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_pyfile('../config.py', silent=True)

# Enable CORS with explicit configuration - must be done before registering blueprints
CORS(app, 
     origins=["http://localhost:8081", "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:8081"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Accept"],
     supports_credentials=True,
     expose_headers=["Content-Type"],
     max_age=3600)

# Add request logging middleware
@app.before_request
def log_request_info():
    logger.debug('Headers: %s', request.headers)
    logger.debug('Body: %s', request.get_data())
    logger.info(f'{request.method} {request.path} from {request.remote_addr}')

# Add CORS headers to all responses (backup)
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin:
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Register blueprints with clear prefixes
app.register_blueprint(price_bp, url_prefix='/api/price')
app.register_blueprint(shortlist_bp, url_prefix='/api/search')
app.register_blueprint(listings_bp, url_prefix='/api/listings')
app.register_blueprint(search)  # Search routes have full /api/search/suggestions path
app.register_blueprint(swipe)  # Swipe routes have full /api/swipe path
app.register_blueprint(financing)  # Financing routes have full /api/financing path
app.register_blueprint(inspection)  # Inspection routes have full /api/inspection path
app.register_blueprint(insurance)  # Insurance routes have full /api/insurance path
app.register_blueprint(vehicle_history)  # Vehicle history routes have full /api/vehicle-history path

# Debug: Print all registered routes
with app.app_context():
    print("\n=== Registered Routes ===")
    for rule in app.url_map.iter_rules():
        print(f"{rule.methods} {rule.rule}")
    print("========================\n")

@app.route('/api/hello')
def hello():
    return {"message": "Hello from backend!"}

@app.route('/api/test-cors', methods=['GET', 'POST', 'OPTIONS'])
def test_cors():
    """Simple endpoint to test CORS is working"""
    if request.method == 'OPTIONS':
        logger.info("OPTIONS preflight request received for /api/test-cors")
        return '', 204
    logger.info(f"Test CORS endpoint hit with method: {request.method}")
    return {"message": "CORS is working!", "method": request.method}

if __name__ == "__main__":
    # Use port 5001 because macOS AirPlay/AirTunes uses port 5000
    app.run(debug=True, port=5001, host='127.0.0.1')
