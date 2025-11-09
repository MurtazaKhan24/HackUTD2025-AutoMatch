import requests
import os
import json 
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()
app = Flask(__name__)
CORS(app) 

VLLM_API_URL = os.environ.get("VLLM_API_URL")
if not VLLM_API_URL:
    raise ValueError("VLLM_API_URL is not set. Please check your .env file.")

# --- NEW PROMPT: FINANCIAL DATA GATHERING ---
SYSTEM_PROMPT = (
    "You are 'AutoMate,' a friendly financial assistant for a car app. "
    "Your goal is to collect relevant pieces of information from the user such as: "
    "If the users asks for help regarding financing a car, such as the ideal number of months for taking a loan, or a suggestion for downpayment given their monthly budget and monthly payment for lower interest kindly help them."
    "1. 'monthly_payment' (their max monthly budget) "
    "2. 'term_months' (their desired loan term in months) "
    "3. 'downpayment' (their down payment amount) "
    "Politely ask for this information ONE question at a time. "
    "Once you have all three, respond *only* with a valid JSON object containing the data. "
    "/no_think"
)

@app.route("/chat", methods=["POST"])
def chat():
    messages = request.json.get("messages")
    if not messages:
        return jsonify({"error": "Messages array is required"}), 400

    vllm_payload = {
        "model": "nvidia/NVIDIA-Nemotron-Nano-9B-v2",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            *messages 
        ],
        "max_tokens": 250,
        "temperature": 0.2,
    }

    try:
        response = requests.post(VLLM_API_URL, json=vllm_payload)
        response.raise_for_status() 

        vllm_response = response.json()
        final_reply = vllm_response.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        # We just send the raw reply. Our React app will check if it's JSON
        return jsonify({"reply": final_reply.strip()}) 

    except Exception as e:
        print(f"Unexpected Server Error: {e}")
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)