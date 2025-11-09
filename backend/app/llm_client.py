import os
import requests
from app.config import VLLM_API_URL
import json

def llm_chat(prompt, response_format=None, temperature=0.2, max_tokens=1024):
    # Construct the full URL - VLLM_API_URL should be http://35.237.67.2:8000/v1
    url = f"{VLLM_API_URL}/chat/completions"
    headers = {"Content-Type": "application/json"}
    
    # Handle both string prompts and message lists
    if isinstance(prompt, str):
        messages = [
            {"role": "system", "content": "You are a helpful car shopping assistant. You help users find cars based on their preferences. Always respond with valid JSON."},
            {"role": "user", "content": prompt}
        ]
    elif isinstance(prompt, list):
        # Already a list of messages
        messages = prompt
    else:
        raise ValueError("prompt must be a string or list of messages")
    
    # Build payload - some vLLM versions don't support response_format
    payload = {
        "model": "nvidia/NVIDIA-Nemotron-Nano-9B-v2",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    # Only add response_format if it's supported (skip for now to avoid 400 error)
    # if response_format:
    #     payload["response_format"] = response_format
    
    try:
        # Increase timeout to 60 seconds for slow LLM responses
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        
        # Extract the actual message content from the response
        if isinstance(result, dict) and 'choices' in result:
            content = result['choices'][0]['message']['content']
            # Try to parse as JSON if requested
            if response_format and (response_format.get('type') in ['json', 'json_object']):
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    # If JSON parsing fails, return error with content
                    return {"error": "Failed to parse JSON response", "content": content}
            return content
        return result
    except requests.exceptions.Timeout:
        print(f"LLM Timeout: Request took longer than 60 seconds")
        return {"error": "LLM request timed out. The server may be overloaded."}
    except requests.exceptions.HTTPError as e:
        # Log the full error response for debugging
        error_detail = e.response.text if hasattr(e.response, 'text') else str(e)
        print(f"LLM HTTP Error: {error_detail}")
        return {"error": str(e)}
    except Exception as e:
        print(f"LLM Error: {str(e)}")
        return {"error": str(e)}
