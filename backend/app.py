import requests
import os  # <-- NEW: Import the 'os' module
from dotenv import load_dotenv  # <-- NEW: Import load_dotenv
from flask import Flask, request, jsonify

# --- NEW: Load environment variables from .env file ---
load_dotenv()
# ----------------------------------------------------

# 1. Initialize the Flask App
app = Flask(__name__)

# 2. Define your vLLM's endpoint
#    It now reads from the environment variable we set in the .env file
VLLM_API_URL = os.environ.get("VLLM_API_URL")

# --- NEW: Add a check to make sure the URL was loaded ---
if not VLLM_API_URL:
    raise ValueError("VLLM_API_URL is not set. Please check your .env file.")
# --------------------------------------------------------

@app.route("/chat", methods=["POST"])
def handle_chat():
    """
    This endpoint receives a prompt from a client,
    forwards it to the vLLM, and returns the vLLM's response.
    """
    
    # 3. Get the user's prompt from the incoming request
    incoming_data = request.get_json()
    if not incoming_data or "prompt" not in incoming_data:
        return jsonify({"error": "Missing 'prompt' in JSON body"}), 400

    user_prompt = incoming_data["prompt"]

    # 4. Prepare the JSON payload for the vLLM
    vllm_payload = {
        "model": "nvidia/NVIDIA-Nemotron-Nano-9B-v2",
        "messages": [{"role": "user", "content": user_prompt}],
        "max_tokens": 3072
    }
    
    headers = {
        "Content-Type": "application/json"
    }

    try:
        # 5. Send the request to the vLLM
        response = requests.post(
            VLLM_API_URL,  # This now uses the variable loaded from .env
            json=vllm_payload, 
            headers=headers
        )
        
        response.raise_for_status() 
        
        # 6. Return the vLLM's response back to the original client
        return response.json()

    except requests.exceptions.HTTPError as http_err:
        return jsonify({"error": f"vLLM API error: {http_err}"}), 502
    except requests.exceptions.RequestException as err:
        return jsonify({"error": f"Request failed: {err}"}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500

# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True, port=5000)