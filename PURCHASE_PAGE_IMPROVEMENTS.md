# Purchase Page Agent Improvements

## Overview
Enhanced the Purchase page with persistent data storage and improved UX for the three agent integrations (Financing, Inspection, and Insurance).

## Key Improvements

### 1. Data Persistence
**Problem**: Agent data was lost when navigating back to the Liked page and returning.

**Solution**: 
- Store agent results in localStorage with car-specific keys
- Key format: `{agent-type}_{year}_{make}_{model}`
- Example: `financing_2020_Toyota_Camry`
- Data persists across page navigations and browser sessions

**Implementation**:
```typescript
// Save data after fetch
const carKey = `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_');
localStorage.setItem(`financing_${carKey}`, JSON.stringify(data));

// Load data on mount
const storedFinancing = localStorage.getItem(`financing_${carKey}`);
if (storedFinancing) {
  setFinancingData(JSON.parse(storedFinancing));
}
```

---

### 2. Button State Management
**Problem**: Users could click the fetch button multiple times, causing redundant API calls.

**Solution**:
- Disable button after data is fetched
- Show checkmark (✓) when data is loaded
- Button remains disabled and shows "✓ Options Loaded" / "✓ Services Loaded" / "✓ Quotes Loaded"

**Button States**:
1. **Initial**: "Find Financing Options" (enabled)
2. **Loading**: "🔄 Searching..." (disabled)
3. **Loaded**: "✓ Options Loaded" (disabled, grayed out)

**Implementation**:
```typescript
<Button 
  disabled={loadingFinancing || !!financingData}
>
  {loadingFinancing ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Searching...
    </>
  ) : financingData ? (
    '✓ Options Loaded'
  ) : (
    'Find Financing Options'
  )}
</Button>
```

---

### 3. Collapsible Results (Dropdown)
**Problem**: Too many results displayed at once, making the page too long.

**Solution**:
- Show only **2 results** initially for each section
- Add "Show All X Options/Services/Providers" button
- Toggle between collapsed (2 items) and expanded (all items) views
- Similar UX to the amortization schedule

**Sections with Dropdowns**:
- ✅ Local Financing Options (initially shows 2 of N)
- ✅ Local Inspection Services (initially shows 2 of N)
- ✅ Insurance Quotes (initially shows 2 of N)

**Implementation**:
```typescript
// State management
const [showAllFinancing, setShowAllFinancing] = useState(false);

// Display logic
{financingData.options.slice(0, showAllFinancing ? financingData.options.length : 2).map(...)}

// Toggle button
{financingData.options.length > 2 && (
  <Button onClick={() => setShowAllFinancing(!showAllFinancing)}>
    {showAllFinancing ? 'Show Less' : `Show All ${financingData.options.length} Options`}
  </Button>
)}
```

---

## User Experience Flow

### First Visit to Purchase Page
1. User clicks "Start Purchase Process" on a car
2. Sees car details, financing summary, amortization schedule
3. Clicks "Find Financing Options" button
4. Button shows loading spinner
5. Results appear (2 shown, rest hidden)
6. Button changes to "✓ Options Loaded" and is disabled
7. Data is saved to localStorage

### Returning to Purchase Page
1. User navigates back to Liked page
2. Returns to the same car's Purchase page
3. **Financing data automatically loads from localStorage**
4. Button already shows "✓ Options Loaded" (disabled)
5. Previous results are displayed (collapsed to 2 items)
6. User can expand/collapse without re-fetching

### Navigation Between Cars
- Each car has its own set of agent data
- Data is keyed by `{year}_{make}_{model}`
- Switching between cars loads appropriate cached data
- No data pollution between different cars

---

## Technical Details

### LocalStorage Schema
```typescript
// Financing data
financing_2020_Toyota_Camry: {
  options: [...],
  summary: "...",
  best_rate: 4.5,
  recommendation: "...",
  zipcode: "75080"
}

// Inspection data
inspection_2020_Toyota_Camry: {
  options: [...],
  summary: "...",
  typical_price_range: "$100-$200",
  recommendation: "...",
  zipcode: "75080"
}

// Insurance data
insurance_2020_Toyota_Camry: {
  options: [...],
  summary: "...",
  rate_factors: "...",
  recommendation: "...",
  zipcode: "75080"
}
```

### State Management
```typescript
// Data states
const [financingData, setFinancingData] = useState<FinancingData | null>(null);
const [inspectionData, setInspectionData] = useState<InspectionData | null>(null);
const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null);

// Loading states
const [loadingFinancing, setLoadingFinancing] = useState(false);
const [loadingInspection, setLoadingInspection] = useState(false);
const [loadingInsurance, setLoadingInsurance] = useState(false);

// Dropdown states
const [showAllFinancing, setShowAllFinancing] = useState(false);
const [showAllInspection, setShowAllInspection] = useState(false);
const [showAllInsurance, setShowAllInsurance] = useState(false);
```

### Data Loading on Mount
```typescript
useEffect(() => {
  // Load finance preferences
  const stored = localStorage.getItem("financePreferences");
  
  // Load agent data for this specific car
  const carKey = car ? `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_') : null;
  
  if (carKey) {
    // Load financing, inspection, and insurance data
    const storedFinancing = localStorage.getItem(`financing_${carKey}`);
    const storedInspection = localStorage.getItem(`inspection_${carKey}`);
    const storedInsurance = localStorage.getItem(`insurance_${carKey}`);
    
    // Parse and set state for each
  }
}, [car]);
```

---

## Benefits

### Performance
- ✅ Reduced API calls (data cached per car)
- ✅ Instant load on return visits
- ✅ No redundant searches

### User Experience
- ✅ Clear button states (loading → loaded)
- ✅ Data persists across navigation
- ✅ Cleaner UI with collapsed results
- ✅ Easy to expand/view all options
- ✅ Consistent with amortization schedule UX

### Cost Savings
- ✅ Fewer SerpAPI calls (4 queries per agent × 3 agents = 12 queries saved per repeat visit)
- ✅ Fewer LLM calls for summarization

---

## Future Enhancements

1. **Cache Expiration**: Add timestamp and expire cached data after 24 hours
2. **Refresh Button**: Allow users to manually refresh stale data
3. **Loading Skeletons**: Show skeleton UI while loading from localStorage
4. **Data Indicators**: Show when data was last fetched ("Updated 2 hours ago")
5. **Compare Mode**: Allow users to compare options side-by-side
6. **Favorites**: Let users mark favorite options within each category
7. **Export**: Export all agent data as PDF for offline reference

---

## Testing Checklist

- [x] Click financing button → data loads and persists
- [x] Navigate away and back → data still there
- [x] Button shows "✓ Options Loaded" after fetch
- [x] Button is disabled after data loads
- [x] Only 2 results shown initially
- [x] "Show All" button appears when > 2 results
- [x] Clicking "Show All" expands all results
- [x] Clicking "Show Less" collapses back to 2 results
- [x] Same behavior for inspection and insurance sections
- [x] Different cars have separate cached data
- [x] No errors in console
- [x] Data survives page refresh
