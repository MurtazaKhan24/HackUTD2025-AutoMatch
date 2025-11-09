from flask import Flask
from flask_cors import CORS
from app.routes.price import price_bp
from app.routes.shortlist import shortlist_bp
from app.routes.listings import listings_bp

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config.from_pyfile('../config.py', silent=True)

app.register_blueprint(price_bp, url_prefix='/api/price')
app.register_blueprint(shortlist_bp, url_prefix='/api/search')
app.register_blueprint(listings_bp, url_prefix='/api/listings')

@app.route('/api/hello')
def hello():
    return {"message": "Hello from backend!"}

if __name__ == "__main__":
    app.run(debug=True)
