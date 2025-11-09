# Agent Improvements - AutoMatch

## Overview
This document describes the major improvements made to make the AutoMatch backend more "agentic" and robust.

## 1. Data Completeness Filtering

### Problem
Many car suggestions from APIs had too many null/missing fields (no price, no photos, no specs), making them useless to users.

### Solution
Added a `is_car_complete()` function in `/backend/app/routes/search.py` that:
- Checks for critical fields (make, model, year)
- Validates important fields (price, photos, specs, VIN/location)
- Requires 75% completeness (3 out of 4 important fields)
- Falls back to top 3 results if all are filtered out

### Benefits
- Users only see high-quality car suggestions
- Better user experience with complete information
- Reduces frustration from incomplete data

## 2. LLM-Driven Agentic Workflow

### Problem
The previous agent was essentially a function pipeline:
1. Build query → 2. Search → 3. Filter → 4. Return
The LLM wasn't making decisions, just following a script.

### Solution
Completely refactored `llm_decision_node()` in `/backend/app/agents/search_agent.py` to:

#### Agent Decision Making
The LLM now:
- **Analyzes** current search state (results found, attempts made)
- **Reasons** about what to search next based on:
  - Number of results found (0, 1-2, 3-4, 5+)
  - User preferences (budget, body style, features)
  - Previous search queries
- **Decides** the next search strategy:
  - Broaden search if no results
  - Find competitors/alternatives if few results
  - Find value alternatives/hidden gems if some results
  - End search if enough quality results

#### Example LLM Reasoning
```json
{
  "reasoning": "Found only 1 result (BMW 3 Series). Should search for direct competitors in same luxury sedan segment to give user more options.",
  "next_query": "Audi A4 Mercedes C-Class Lexus IS luxury sedan 2020-2024",
  "decision": "search"
}
```

#### Key Changes
- **Increased attempts**: 3 → 5 (gives LLM more room to explore)
- **Increased target results**: 3 → 5 (better selection for users)
- **LLM prompt**: Detailed context about user preferences, search history, current results
- **Structured output**: JSON response with reasoning, next_query, decision
- **Fallback logic**: Rule-based backup if LLM fails
- **State tracking**: Preserves `original_query` and `llm_reasoning` for reference

### Benefits
- **Truly autonomous**: LLM makes strategic decisions, not just following a pipeline
- **Adaptive**: Adjusts search strategy based on results
- **Transparent**: User can see LLM's reasoning in the UI
- **Resilient**: Falls back to rules if LLM fails

## 3. Frontend Integration

### Changes in `/src/pages/Swipe.tsx`
- Added `searchMetadata` state to track LLM reasoning
- Display "AI Search Insights" card showing:
  - LLM's reasoning/strategy
  - Number of search attempts
  - Search strategy type (e.g., "LLM-driven adaptive search")

### Benefits
- Users see the "AI brain" at work
- Builds trust through transparency
- Educational - users understand why they see certain cars

## 4. Overall Architecture

### Before (Function Pipeline)
```
User Input → Build Query → Search → Filter → Return
            (static)      (static) (static)
```

### After (Agentic Workflow)
```
User Input → LLM Decision → Search → LLM Decision → Search → ...
            (analyzes)       (executes) (adapts)     (executes)
            ↓
            Decides: broaden? alternatives? competitors? end?
```

## Files Modified

1. `/backend/app/routes/search.py`
   - Added `is_car_complete()` function
   - Integrated completeness filtering before price filtering

2. `/backend/app/agents/search_agent.py`
   - Refactored `llm_decision_node()` for true agent reasoning
   - Added LLM prompt for strategic decision making
   - Increased attempts and target results
   - Added state tracking for reasoning

3. `/src/pages/Swipe.tsx`
   - Added metadata display
   - Created AI insights card

## Testing the Improvements

### To see the agent in action:
1. Start backend: `cd backend && python run.py`
2. Start frontend: `cd frontend && npm run dev`
3. Enter preferences with a budget (e.g., $50,000)
4. Watch the console logs for LLM reasoning
5. See the "AI Search Insights" card on the swipe page

### Expected behavior:
- Console shows: "🤖 LLM Reasoning: ..."
- Multiple search attempts with different queries
- UI shows the LLM's strategy explanation
- Results are complete (no cars with missing critical data)

## Future Enhancements

1. **Cache LLM decisions** to reduce API calls for similar searches
2. **A/B test** LLM-driven vs rule-based to measure quality
3. **User feedback loop**: Let users rate suggestions to improve LLM prompts
4. **Multi-LLM approach**: Use different LLMs for different tasks (search strategy vs. filtering)
5. **Streaming responses**: Show LLM reasoning in real-time as it thinks

## Metrics to Track

- Average attempts per search
- Success rate (searches with 5+ results)
- Data completeness rate (% of cars passing filter)
- User engagement (swipe rate, like rate)
- LLM failure rate (fallback to rules)
