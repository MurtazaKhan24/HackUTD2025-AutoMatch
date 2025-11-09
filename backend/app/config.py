import os
from dotenv import load_dotenv
load_dotenv()

VLLM_API_URL = os.getenv("VLLM_API_URL")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")
BING_KEY = os.getenv("BING_KEY")
AUTO_DEV_KEY = os.getenv("AUTO_DEV_KEY")
