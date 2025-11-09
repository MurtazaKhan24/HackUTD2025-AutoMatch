import os
import requests
from app.config import VLLM_API_URL

def llm_chat(messages, response_format=None, temperature=0.2, max_tokens=1024):
    url = f"{VLLM_API_URL}/chat/completions"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": "nvidia/NVIDIA-Nemotron-Nano-9B-v2",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        payload["response_format"] = response_format
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=20)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        return {"error": str(e)}
