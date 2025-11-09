# Agent Integrations Documentation

This document describes the AI agent integrations in the CarTender car shopping platform.

## Overview

CarTender uses specialized AI agents to help users find local services and resources during the car buying process. Each agent uses web search, data extraction, and LLM-powered summarization to provide personalized recommendations.

## Agents

### 1. Finance Agent (`finance_agent.py`)
**Purpose**: Find local banks and credit unions with competitive auto loan rates.

**Endpoint**: `POST /api/financing/local-rates`

**Request Body**:
```json
{
  "zipcode": "75080",
  "credit_score": "good"  // Options: excellent, good, fair, poor
}
```

**Response**:
```json
{
  "options": [
    {
      "institution": "Local Credit Union",
      "rate": 4.5,
      "snippet": "Offering competitive rates...",
      "link": "https://example.com",
      "source": "web_search"
    }
  ],
  "summary": "Found competitive rates from local lenders...",
  "best_rate": 4.5,
  "recommendation": "Credit unions typically offer better rates...",
  "zipcode": "75080"
}
```

**Features**:
- Parallel search across multiple queries
- Rate extraction from search results
- LLM-powered summarization and recommendations
- Filters for realistic APR ranges (0-30%)

---

### 2. Inspection Agent (`inspection_agent.py`)
**Purpose**: Find local mechanics and inspection services for pre-purchase inspections.

**Endpoint**: `POST /api/inspection/local-services`

**Request Body**:
```json
{
  "zipcode": "75080",
  "car_type": "2020 Toyota Camry"
}
```

**Response**:
```json
{
  "options": [
    {
      "name": "Joe's Auto Inspection",
      "snippet": "Certified ASE mechanics...",
      "link": "https://example.com",
      "price": 150,
      "rating": 4.8,
      "phone": "(555) 123-4567",
      "source": "web_search"
    }
  ],
  "summary": "Found certified inspection services in your area...",
  "typical_price_range": "$100-$200",
  "recommendation": "Choose a certified mechanic with good reviews...",
  "zipcode": "75080"
}
```

**Features**:
- Searches for ASE-certified mechanics
- Extracts pricing and ratings
- Phone number extraction for direct contact
- LLM-powered service quality recommendations

---

### 3. Insurance Agent (`insurance_agent.py`)
**Purpose**: Find local insurance companies and agents with auto insurance quotes.

**Endpoint**: `POST /api/insurance/local-quotes`

**Request Body**:
```json
{
  "zipcode": "75080",
  "car_details": "2020 Toyota Camry",
  "driver_age": 30
}
```

**Response**:
```json
{
  "options": [
    {
      "provider": "State Farm",
      "snippet": "Affordable coverage options...",
      "link": "https://example.com",
      "monthly_rate": 120,
      "rating": 4.5,
      "phone": "(555) 987-6543",
      "source": "web_search"
    }
  ],
  "summary": "Found multiple insurance providers in your area...",
  "rate_factors": "Age, driving history, and vehicle type affect rates...",
  "recommendation": "Compare quotes from at least 3 providers...",
  "zipcode": "75080"
}
```

**Features**:
- Identifies major insurance providers
- Extracts monthly rate estimates
- Provider ratings and contact information
- LLM-powered rate factor analysis

---

## Frontend Integration

All agents are integrated into the **Purchase page** (`/frontend/src/pages/Purchase.tsx`).

### User Flow

1. User selects a car from their liked cars
2. Navigates to the Purchase page
3. Sees financing summary and amortization schedule
4. Can click buttons to fetch:
   - **Local Financing Options** - Shows banks/credit unions with rates
   - **Find Inspectors** - Shows local mechanics for PPI
   - **Compare Insurance** - Shows insurance providers with quotes

### UI Features

- Loading states with spinner animations
- Toast notifications for search progress
- Expandable result cards with:
  - Provider/service name
  - Pricing information
  - Ratings (when available)
  - Contact buttons (website link, phone call)
- Color-coded sections:
  - 🔵 Financing (blue/automotive-red)
  - 🟣 Inspection (purple)
  - 🟠 Insurance (orange)

### Prerequisites

User must have set their **zipcode** in the Finance Preferences page. This is stored in localStorage and used by all agents.

---

## Technical Details

### Search Strategy

1. **Query Generation**: Each agent generates 3-4 targeted search queries
2. **Parallel Execution**: Searches run concurrently using ThreadPoolExecutor
3. **Data Extraction**: Regex patterns extract relevant data (rates, prices, phone numbers)
4. **Deduplication**: Results are deduplicated by name/institution
5. **LLM Summarization**: OpenAI/vLLM analyzes results and provides recommendations

### Error Handling

- Graceful fallbacks if search fails
- Default recommendations if LLM fails
- User-friendly error messages in frontend
- Comprehensive logging for debugging

### Rate Limiting & Caching

- **Current**: No caching (each request hits SerpAPI)
- **Future**: Consider caching results by zipcode for 24 hours
- **Cost**: Each agent search uses 4 SerpAPI queries

---

## Environment Variables

Required in `.env` or `config.py`:

```bash
SERPAPI_KEY=your_serpapi_key_here
VLLM_API_URL=http://your-llm-endpoint
```

---

## Future Enhancements

1. **Caching**: Cache results by zipcode to reduce API costs
2. **User Ratings**: Allow users to rate/review services
3. **Appointment Booking**: Direct integration with service calendars
4. **Price Monitoring**: Track rate changes over time
5. **More Agents**:
   - DMV/Registration services
   - Extended warranty providers
   - Car detailing services
   - Towing/roadside assistance

---

## Testing

To test the agents:

1. Start the backend server:
   ```bash
   cd backend
   python -m app.main
   ```

2. The server should be running on `http://localhost:5001`

3. Test endpoints with curl:
   ```bash
   # Finance agent
   curl -X POST http://localhost:5001/api/financing/local-rates \
     -H "Content-Type: application/json" \
     -d '{"zipcode": "75080", "credit_score": "good"}'
   
   # Inspection agent
   curl -X POST http://localhost:5001/api/inspection/local-services \
     -H "Content-Type: application/json" \
     -d '{"zipcode": "75080", "car_type": "sedan"}'
   
   # Insurance agent
   curl -X POST http://localhost:5001/api/insurance/local-quotes \
     -H "Content-Type: application/json" \
     -d '{"zipcode": "75080", "car_details": "sedan", "driver_age": 30}'
   ```

4. Or test through the UI:
   - Navigate to a liked car
   - Click "Start Purchase Process"
   - Click each agent button to see results

---

## Troubleshooting

**No results found?**
- Check that SERPAPI_KEY is valid
- Try a different zipcode
- Check backend logs for errors

**LLM errors?**
- Ensure VLLM_API_URL is accessible
- Check LLM response format (should be JSON)
- Fallback summaries will be used automatically

**Frontend not connecting?**
- Verify backend is running on port 5001
- Check CORS settings in `backend/app/main.py`
- Check browser console for network errors
