from pydantic import BaseModel, Field
from typing import Optional, List, Dict

class PriceRequest(BaseModel):
    budget: float
    payment: str
    state: Optional[str] = None
    county: Optional[str] = None
    zipcode: Optional[str] = None
    down_payment: Optional[float] = None
    apr: Optional[float] = None
    term_months: Optional[int] = None

class PriceResponse(BaseModel):
    target_listing_price: float
    assumptions: Dict[str, str]

class ShortlistRequest(BaseModel):
    budget: float
    target_listing_price: Optional[float] = None
    body_style: Optional[List[str]] = None
    features_must: Optional[List[str]] = None
    features_nice: Optional[List[str]] = None
    region: Optional[str] = None
    year_range: Optional[Dict[str, int]] = None

class ShortlistItem(BaseModel):
    make: str
    model: str
    trim: Optional[str]
    why: str
    score: float
    source_urls: List[str]

class ShortlistResponse(BaseModel):
    items: List[ShortlistItem]

class ListingsRequest(BaseModel):
    year: Optional[int]
    year_range: Optional[Dict[str, int]]
    make: str
    model: str
    zipcode: str
    radius_miles: Optional[int] = 25
    features: Optional[List[str]] = None

class Listing(BaseModel):
    price: float
    mileage: Optional[float]
    year: int
    make: str
    model: str
    trim: Optional[str]
    location: Optional[str]
    dealer_name: Optional[str]
    url: Optional[str]
    vin: Optional[str]

class ListingsResponse(BaseModel):
    listings: List[Listing]
    tried: Dict[str, List]
    summary: Optional[str]
