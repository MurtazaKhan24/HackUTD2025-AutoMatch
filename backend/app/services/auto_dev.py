from typing import Dict, List, Optional
import aiohttp
import asyncio
from app.config import AUTO_DEV_API_KEY
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class AutoDevService:
    def __init__(self, api_key: str = AUTO_DEV_API_KEY):
        self.api_key = api_key
        self.base_url = "https://api.auto.dev/listings"  # Correct base URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
    async def get_car_details(self, make: str, model: str, year: int) -> Optional[Dict]:
        """Get detailed information about a specific car from auto.dev listings."""
        logger.info(f"=== Fetching auto.dev details for {year} {make} {model} ===")
        
        try:
            # Check if API key is set
            if not self.api_key or self.api_key == "your_auto_dev_api_key_here":
                logger.warning("AUTO_DEV_API_KEY not set or is placeholder - skipping enrichment")
                return None
            
            logger.info(f"Using API key: {self.api_key[:10]}..." if self.api_key else "No API key")
            
            # Build query parameters matching the working code
            params = {
                'vehicle.make': make,
                'vehicle.model': model,
                'vehicle.year': year,
                'zip': '75080',  # Default zip, could be parameterized
                'distance': 500,  # Wide radius to find listings
                'limit': 5
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, headers=self.headers, params=params, timeout=aiohttp.ClientTimeout(total=15)) as response:
                    logger.info(f"auto.dev listings request: {response.status}")
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error getting listings: Status {response.status}, Response: {error_text}")
                        return None
                        
                    data = await response.json()
                    logger.debug(f"auto.dev response: {data}")
                    
                    # Parse response similar to working code
                    listings = data.get("data")
                    if isinstance(listings, dict):
                        listings = [listings]
                    elif not isinstance(listings, list):
                        listings = data.get("listings", [])
                    
                    if not listings:
                        logger.warning(f"No listings found for {year} {make} {model}")
                        return None
                    
                    # Get the first listing for details
                    first_listing = listings[0]
                    details = first_listing.get("data", first_listing)
                    vehicle_info = details.get("vehicle", {})
                    retail = details.get("retailListing", {})
                    
                    logger.info(f"Listing structure - photos field: {details.get('photos')}")
                    logger.info(f"Vehicle info: {vehicle_info}")
                    logger.info(f"Retail listing: {retail}")
                    
                    # Get VIN for photo lookup
                    vin = details.get("vin")
                    logger.info(f"VIN: {vin}")
                    
                    # Extract photos using VIN if available
                    photos = []
                    if vin:
                        # Make a second API call to get photos by VIN
                        photo_url = f"https://api.auto.dev/photos/{vin}"
                        try:
                            async with session.get(photo_url, headers=self.headers, timeout=aiohttp.ClientTimeout(total=10)) as photo_response:
                                if photo_response.status == 200:
                                    photo_data = await photo_response.json()
                                    retail_photos = photo_data.get("data", {}).get("retail", [])
                                    photos = retail_photos[:5]  # First 5 photos
                                    logger.info(f"Got {len(photos)} photos from photos API")
                                else:
                                    logger.warning(f"Photos API returned {photo_response.status}")
                        except Exception as photo_error:
                            logger.warning(f"Failed to fetch photos for VIN {vin}: {photo_error}")
                    
                    logger.info(f"Final photos count: {len(photos)}")
                    
                    # Extract price
                    price_value = retail.get("price") or details.get("price")
                    
                    # Build result
                    result = {
                        "make": make.title(),
                        "model": model.title(),
                        "year": year,
                        "trim": vehicle_info.get("trim") or "Base",
                        "price": {
                            "marketValue": price_value
                        },
                        "photos": photos,
                        "specs": {
                            "mpg": vehicle_info.get("mpg") or f"{vehicle_info.get('mpgCity', 'N/A')}/{vehicle_info.get('mpgHighway', 'N/A')}",
                            "horsepower": vehicle_info.get("horsepower"),
                            "transmission": vehicle_info.get("transmission"),
                            "drivetrain": vehicle_info.get("drivetrain"),
                            "engine": vehicle_info.get("engine")
                        },
                        "features": details.get("features", [])[:10],
                        "pros": [],
                        "cons": [],
                        "safety_rating": None,
                        "vin": details.get("vin"),
                        "location": ", ".join(filter(None, [retail.get("dealer"), retail.get("city"), retail.get("state")])),
                        "cached_at": datetime.now().isoformat()
                    }
                    
                    logger.info(f"Enriched data: price={result.get('price', {}).get('marketValue')}, photos={len(result.get('photos', []))}")
                    return result
                        
        except Exception as e:
            logger.error(f"Error fetching car details for {year} {make} {model}: {e}", exc_info=True)
            return None
            
    async def enrich_car_list(self, cars: List[Dict]) -> List[Dict]:
        """Enrich a list of cars with details from auto.dev."""
        tasks = []
        for car in cars:
            task = self.get_car_details(
                make=car["make"],
                model=car["model"],
                year=int(car["year"])
            )
            tasks.append(task)
            
        # Execute all requests concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine original data with enriched data
        enriched_cars = []
        for car, result in zip(cars, results):
            if isinstance(result, Exception):
                logger.error(f"Error enriching car {car}: {result}")
                enriched_cars.append(self._add_fallback_data(car))
            elif result and result.get('trim') != 'ApiController::NotFound':
                # Merge original and enriched data (only if we got valid data)
                enriched_cars.append({**car, **result})
            else:
                # auto.dev doesn't have this car, use fallback
                logger.warning(f"auto.dev doesn't have data for {car['year']} {car['make']} {car['model']}, using fallback")
                enriched_cars.append(self._add_fallback_data(car))
                
        return enriched_cars
    
    def _add_fallback_data(self, car: Dict) -> Dict:
        """Add fallback data when auto.dev doesn't have the car."""
        make = car.get('make', '').lower()
        model = car.get('model', '').lower()
        year = car.get('year', '2020')
        
        # Use a more specific car image - try multiple sources
        photos = []
        
        # Option 1: Try Unsplash with specific search
        search_term = f"{make}+{model}".replace(' ', '+')
        photos.append(f"https://source.unsplash.com/800x600/?{search_term},car")
        
        # Option 2: Add a generic car photo as backup
        photos.append("https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80")
        
        return {
            **car,
            "photos": photos,
            "price": {
                "marketValue": car.get('price', {}).get('marketValue') if isinstance(car.get('price'), dict) else car.get('price')
            },
            "specs": {
                "mpg": None,
                "horsepower": None,
                "transmission": None,
                "drivetrain": None,
                "engine": None
            },
            "trim": car.get('trim', 'Base'),
            "features": [],
            "pros": [],
            "cons": [],
            "safety_rating": None
        }
