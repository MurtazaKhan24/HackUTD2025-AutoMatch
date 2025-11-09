from app.llm_client import llm_chat
from app.schemas import ListingsRequest, ListingsResponse, Listing

def get_listings(req: ListingsRequest) -> ListingsResponse:
    # TODO: Validate, call auto.dev, retry policy
    # Return ListingsResponse
    return ListingsResponse(listings=[Listing(price=35000, mileage=12000, year=2023, make="Toyota", model="GR Supra", trim="Base", location="Dallas, TX", dealer_name="Toyota Dealer", url="https://example.com", vin="1234567890")], tried={"radii": [25], "years": [2023]}, summary="Stub response. Implement auto.dev call.")
