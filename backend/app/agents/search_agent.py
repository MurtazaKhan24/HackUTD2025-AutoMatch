from app.llm_client import llm_chat
from app.schemas import ShortlistRequest, ShortlistResponse, ShortlistItem

def get_shortlist(req: ShortlistRequest) -> ShortlistResponse:
    # TODO: Generate queries, call search API, parse, score, dedupe
    # Return ShortlistResponse
    return ShortlistResponse(items=[ShortlistItem(make="Toyota", model="Camry", trim="SE", why="Popular reliable sedan", score=0.9, source_urls=["https://example.com"])])
