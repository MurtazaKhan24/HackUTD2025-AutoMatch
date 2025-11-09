import os
import json
import logging
import httpx 
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from dotenv import load_dotenv

_LOGGER = logging.getLogger(__name__)

# --- Configuration ---
# The key is read once at the module level (like before)
load_dotenv()  
AUTO_DEV_API_KEY = os.getenv("AUTO_DEV_API_KEY")
BASE_URL = "https://api.auto.dev/listings"

if not AUTO_DEV_API_KEY:
    _LOGGER.warning(
        "AUTO_DEV_API_KEY environment variable not set. API calls to auto.dev will fail."
    )
    # NOTE: It's good practice to ensure the LLM can't proceed if the tool is broken.
    # We rely on the code inside the function to return a structured error message.

# --- Tool Input Schema (Remains Unchanged) ---
class AutoDevInput(BaseModel):
    """Input schema for the search_auto_dev tool."""
    make: str = Field(..., description="The vehicle manufacturer")
    model: str = Field(..., description="The vehicle model")
    year: int = Field(..., description="The model year")
    zip: str = Field(..., description="The 5-digit US ZIP code for the search")
    distance: int = Field(..., description="The search radius in miles")
    limit: int = Field(..., description="The maximum number of listings to return")

# --- The Corrected Tool Implementation ---
@tool(args_schema=AutoDevInput)
async def search_auto_dev(
    make: str, model: str, year: int, zip: str, distance: int, limit: int
) -> str:
    """
    Searches the auto.dev API for vehicle listings based on make, model, year,
    zip code, and distance. Returns a JSON string of listings.
    """

    # 1. Properly apply the Bearer prefix and build headers at runtime
    headers = {
        'Authorization': f'Bearer {AUTO_DEV_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # 2. Build Query Parameters
    params = {
        'vehicle.make': make,
        'vehicle.model': model,
        'vehicle.year': year,
        'zip': zip, 
        'distance': distance,
        'limit': limit
    }
    
    _LOGGER.info(f"Calling auto.dev API with params: {params}")

    # 3. Execute Asynchronous Request
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                BASE_URL, 
                headers=headers, 
                params=params,
                timeout=15.0
            )
            
            response.raise_for_status() 

            data = response.json()

            trimmed_listings = []

            # Auto.dev might return a dict with {"data": [...]} or {"data": {...}}
            listings = data.get("data")
            if isinstance(listings, dict):
                listings = [listings]
            elif not isinstance(listings, list):
                listings = data.get("listings", [])

            for item in listings:
                # Each listing has its details under item['data']
                details = item.get("data", item)
                vehicle_info = details.get("vehicle", {})
                retail = details.get("retailListing", {})

                # Build location string safely (comma-separated)
                location = ", ".join(filter(None, [
                    retail.get("dealer"),
                    retail.get("city"),
                    retail.get("state")
                ]))

                trimmed_listings.append({
                    "make": vehicle_info.get("make"),
                    "model": vehicle_info.get("model"),
                    "year": vehicle_info.get("year"),
                    "price": retail.get("price"),
                    "location": location,
                    "vin": details.get("vin")
                })

            _LOGGER.info(f"Trimmed {len(trimmed_listings)} listings from API response.")

            safe_listings = []
            for i in trimmed_listings:
                safe_listings.append({
                    "make": str(i.get("make", "")),
                    "model": str(i.get("model", "")),
                    "year": str(i.get("year", "")),
                    "price": str(i.get("price", "")),
                    "location": str(i.get("location", "")),
                    "vin": str(i.get("vin", "")),
                })

        #print(safe_listings)
        return safe_listings
                
    except httpx.HTTPStatusError as e:
        _LOGGER.error(f"HTTP error {e.response.status_code} occurred: {e}")
        # Return a structured error for the LLM to read
        return json.dumps(
            {
                "error": "HTTP Status Error", 
                "status_code": e.response.status_code, 
                "details": f"Failed to fetch data: {e.response.text[:100]}..." # Limit detail size
            }
        )
    except httpx.RequestError as e:
        _LOGGER.error(f"An error occurred while requesting: {e}")
        return json.dumps({"error": "Request Error", "details": str(e)})
    except Exception as e:
        _LOGGER.error(f"An unexpected error occurred: {e}")
        return json.dumps({"error": "Unexpected Error", "details": str(e)})
