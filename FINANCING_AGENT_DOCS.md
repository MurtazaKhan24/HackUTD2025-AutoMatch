# Financing Agent Integration

## Overview
The financing agent is an AI-powered tool that searches for local banks and credit unions, extracts interest rates, and provides personalized financing recommendations for car purchases.

## Backend Components

### Finance Agent (`backend/app/agents/finance_agent.py`)
- **Main Function**: `search_local_financing(zipcode, credit_score)`
- **Features**:
  - Parallel search across multiple queries for local financing options
  - Intelligent rate extraction using regex patterns
  - LLM-powered analysis and summarization
  - Deduplication of results
  - Returns top 10 unique financing options

### API Route (`backend/app/routes/financing.py`)
- **Endpoint**: `POST /api/financing/local-rates`
- **Request Body**:
  ```json
  {
    "zipcode": "75080",
    "credit_score": "good"  // Options: excellent, good, fair, poor
  }
  ```
- **Response**:
  ```json
  {
    "options": [
      {
        "institution": "Bank Name",
        "rate": 5.5,
        "snippet": "Description of financing option",
        "link": "https://...",
        "source": "web_search"
      }
    ],
    "summary": "AI-generated summary of options",
    "best_rate": 5.5,
    "recommendation": "AI-generated recommendation",
    "zipcode": "75080"
  }
  ```

## Frontend Integration

### Finance Preferences Page
- Collects user zipcode and credit score range
- Stores in localStorage for use in Purchase flow
- Credit score options:
  - Excellent (720+)
  - Good (680-719)
  - Fair (630-679)
  - Poor (Below 630)

### Purchase Page
- **"Find Financing Options" Button**: Triggers agent search
- Displays loading state while searching
- Shows results in dedicated card with:
  - AI summary of options
  - Best rate highlight
  - List of up to 5 financing options with institution name, rate, and link
  - Ability to open bank website in new tab
- Automatically updates estimated APR if better rate is found

## User Flow

1. User enters finance preferences including zipcode and credit score
2. User selects a car and goes to Purchase page
3. User clicks "Find Financing Options" button
4. Backend agent:
   - Searches Google via SerpAPI for local banks/credit unions
   - Extracts interest rates from search results
   - Deduplicates results
   - Uses LLM to analyze and summarize options
5. Frontend displays:
   - Best rate found
   - AI-generated summary and recommendations
   - List of financing options with links
6. User can click through to bank websites for more details

## Configuration

### Required Environment Variables
- `SERPAPI_KEY`: For web search functionality
- `VLLM_API_URL`: For LLM analysis and summarization

### Customization
- Adjust search queries in `finance_agent.py` for different regions
- Modify rate extraction patterns for different formats
- Update credit score mappings for more granular recommendations
- Customize LLM prompt for different analysis styles

## Future Enhancements
- Cache results by zipcode to reduce API calls
- Add local credit union directory integration
- Include pre-approval application links
- Show rate trends over time
- Add comparison with national averages
- Include special offers and promotions
