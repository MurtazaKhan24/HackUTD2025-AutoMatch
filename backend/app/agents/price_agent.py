from app.llm_client import llm_chat
from app.schemas import PriceRequest, PriceResponse

def get_target_listing_price(req: PriceRequest) -> PriceResponse:
    # Compose system prompt for strict JSON response
    system_prompt = (
        "Respond with JSON only. Given budget, payment method, and location, compute a recommended target_listing_price "
        "so that out-the-door (OTD) cost fits the budget. OTD includes listing price, estimated taxes, title, documentation, and fees. "
        "If payment=='cash', no interest; if loan, apply APR/term/down payment. "
        "If taxes/fees are not specified, estimate them as 8% of the listing price. "
        "Subtract these estimated costs from the budget to compute target_listing_price. "
        "Round target_listing_price to the nearest hundred dollars. "
        "Use sensible defaults if omitted and include them in assumptions. "
        "Your response must be a JSON object with these fields: "
        "target_listing_price (float), assumptions (object). "
        "All values in assumptions must be strings. "
        "Example: If budget is $35,000 cash, and taxes/fees are estimated at 8%, then target_listing_price = budget / 1.08 ≈ $32,407.41, rounded to $32,400. "
        "Respond: {\"target_listing_price\": 32400.0, \"assumptions\": {\"state\": \"TX\", \"county\": \"Dallas\", \"zipcode\": \"75080\", \"down_payment\": \"0\", \"apr\": \"0\", \"term_months\": \"0\", \"taxes_fees_percent\": \"8\"}} "
        "Do not use any other field names."
    )
    user_content = {
        "budget": req.budget,
        "payment": req.payment,
        "state": req.state,
        "county": req.county,
        "zipcode": req.zipcode,
        "down_payment": req.down_payment,
        "apr": req.apr,
        "term_months": req.term_months
    }
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": str(user_content)}
    ]
    response = llm_chat(messages, response_format={"type": "json_object"}, temperature=0.2, max_tokens=512)
    result = response.get("choices", [{}])[0].get("message", {}).get("content", "{}")
    import json
    try:
        parsed = json.loads(result)
        return PriceResponse(**parsed)
    except Exception as e:
        print(response)
        print(f"Error parsing LLM response: {e}")
        return PriceResponse(target_listing_price=0, assumptions={"error": "Failed to parse LLM response", "raw": str(result)})
