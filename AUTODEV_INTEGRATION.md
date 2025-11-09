# Auto.dev API Integration

## Overview
Integrated Auto.dev's Vehicle Listings API to fetch real-time vehicle listing data, including VIN decoding, detailed specifications, pricing, dealer information, and listing URLs. This provides users with accurate, up-to-date information about vehicles directly from dealer listings.

## Features

### 1. **Real-Time Listing Data**
- ✅ Fetch vehicle details by VIN
- ✅ Search for listings by year/make/model
- ✅ Get pricing, mileage, and condition information
- ✅ Access dealer contact information and location
- ✅ View original listing URLs

### 2. **Detailed Vehicle Information**
- ✅ Engine specifications (type, horsepower, torque)
- ✅ Fuel economy (city/highway MPG)
- ✅ Transmission and drivetrain details
- ✅ Exterior and interior colors
- ✅ Full feature lists
- ✅ High-quality vehicle images

### 3. **Smart Caching**
- ✅ Listing details cached per vehicle
- ✅ Reduces API calls on repeat views
- ✅ Persists in localStorage with liked cars
- ✅ Instant access to previously viewed details

### 4. **Seamless Purchase Flow**
- ✅ Direct links to dealer listings
- ✅ Contact information ready to use
- ✅ Integration with Purchase page
- ✅ One-click access to full listing

## API Endpoints Used

### Auto.dev API Base URL
```
https://api.auto.dev/api
```

### 1. Vehicle Listings Search
**Endpoint:** `POST /api/listings`

**Request:**
```json
{
  "year": 2023,
  "make": "Toyota",
  "model": "Camry",
  "zipcode": "75080",
  "radius": 50
}
```

**Response:** Array of vehicle listings with full details

### 2. VIN Lookup
**Endpoint:** `POST /api/listings`

**Request:**
```json
{
  "vin": "1HGBH41JXMN109186"
}
```

**Response:** Specific vehicle listing for that VIN

### 3. VIN Decode
**Endpoint:** `GET /api/vin/{vin}`

**Response:** Vehicle specifications decoded from VIN

## Frontend Integration

### File Structure
```
frontend/
├── src/
│   ├── lib/
│   │   └── autodev-api.ts         # API utility functions
│   └── pages/
│       ├── Swipe.tsx              # Modal integration on swipe cards
│       ├── Liked.tsx              # Modal integration on liked cars
│       └── Purchase.tsx           # Listing URL integration
```

### API Utility Functions

#### `fetchVehicleListingByVIN(vin: string)`
Fetches detailed listing information for a specific VIN.

```typescript
const details = await fetchVehicleListingByVIN("1HGBH41JXMN109186");
```

#### `searchVehicleListings(year, make, model, zipcode?, radius?)`
Searches for listings matching the vehicle description near a zipcode.

```typescript
const listings = await searchVehicleListings(2023, "Tesla", "Model 3", "75080", 50);
```

#### `decodeVIN(vin: string)`
Decodes a VIN to get basic vehicle specifications.

```typescript
const specs = await decodeVIN("1HGBH41JXMN109186");
```

### Modal Implementation

Both Swipe and Liked pages now have detailed modals that:

1. **Open on Card Tap/Click**
   - Swipe page: Tap card to open modal
   - Liked page: Click card to open modal

2. **Fetch Listing Details**
   - First attempts VIN lookup (if VIN available)
   - Falls back to year/make/model search
   - Uses user's zipcode from finance preferences

3. **Display Rich Information**
   - Large hero image
   - Price and basic specs grid
   - Engine & performance details
   - Exterior/interior colors
   - Feature list
   - Description
   - Dealer information

4. **Action Buttons**
   - View Full Listing (opens dealer website)
   - View Agent Research (if available)
   - Start Purchase Process
   - Like/Pass (Swipe page only)

## User Experience Flow

### Swipe Page
1. User sees car card in swipe interface
2. **Tap card** → Modal opens
3. Loading spinner while fetching Auto.dev listing
4. Detailed information appears
5. User can:
   - View full dealer listing
   - Like the car (adds to favorites)
   - Pass on the car
   - Start purchase process
6. Modal closes, returns to swipe interface

### Liked Page
1. User sees grid of liked cars
2. **Click any card** → Modal opens
3. Loading spinner while fetching Auto.dev listing
4. Detailed information appears (including pros/cons from agent)
5. User can:
   - View full dealer listing
   - View agent research
   - Start purchase process
   - Remove from favorites
6. Modal closes, returns to garage view

### Purchase Page
1. "View Dealer Listing" button uses Auto.dev listing URL
2. Opens original dealer website in new tab
3. User can contact dealer directly

## Data Structure

### VehicleListingDetails Interface
```typescript
interface VehicleListingDetails {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage?: number;
  price?: number;
  exteriorColor?: string;
  interiorColor?: string;
  transmission?: string;
  drivetrain?: string;
  engine?: string;
  fuelType?: string;
  mpgCity?: number;
  mpgHighway?: number;
  horsepower?: number;
  torque?: number;
  features?: string[];
  images?: string[];
  listingUrl?: string;
  dealerName?: string;
  dealerPhone?: string;
  dealerAddress?: string;
  cityState?: string;
  description?: string;
  specifications?: {
    [key: string]: string | number;
  };
}
```

### Car Interface (Extended)
```typescript
interface Car {
  // ...existing fields...
  vin?: string;
  listingDetails?: VehicleListingDetails;
}
```

## Caching Strategy

### First View
1. Modal opens, shows loading spinner
2. Checks if `car.listingDetails` exists (cached)
3. If not cached:
   - Fetches from Auto.dev API
   - Stores in `car.listingDetails`
   - Updates localStorage for persistence
4. Displays detailed information

### Return View
1. Modal opens
2. Finds cached `car.listingDetails`
3. **Instant display** (no API call)
4. No loading spinner

### Benefits
- ✅ Faster user experience on repeat views
- ✅ Reduced API usage
- ✅ Works offline for cached listings
- ✅ Persists across browser sessions

## Configuration

### Environment Variables

Create `/frontend/.env` file:
```bash
VITE_AUTODEV_API_KEY=your_api_key_here
```

**Note:** Example file provided in `.env.example`

### API Key Setup

1. Sign up at [Auto.dev](https://auto.dev)
2. Navigate to API Keys section
3. Generate a new API key
4. Add to `.env` file
5. Restart development server

### Default Fallback

If no API key is provided, the code includes a default key for testing:
```typescript
const AUTODEV_API_KEY = import.meta.env.VITE_AUTODEV_API_KEY || 'ZrQEPSkDzJg8TJCwijaAVLMl3yHCh8qU4FpKiBAp';
```

## Modal UI Components

### Information Sections

#### 1. Hero Image
- Large, full-width image
- Rounded corners
- First image from listing (if available)

#### 2. Price Display
- Large, bold text
- Automotive blue color
- Formatted with commas

#### 3. Basic Info Grid (2x2)
- Mileage
- Transmission
- Drivetrain
- Fuel Type

#### 4. Engine & Performance
- Engine type
- Horsepower (hp)
- Torque (lb-ft)
- Fuel economy (city/highway)

#### 5. Colors
- Exterior color
- Interior color
- Side-by-side display

#### 6. Features List
- Bullet points
- Scrollable if many features
- Light gray background

#### 7. Description
- Dealer's description text
- Full paragraph format
- Light gray background

#### 8. Dealer Information
- Dealer name (bold)
- Full address
- City/State
- Phone number with emoji

### Action Buttons

#### Swipe Page
- **Pass** (outline, red theme)
- **Like** (solid, green theme)

#### Liked Page
- **View Agent Research** (gradient purple/blue)
- **View Full Listing** (outline, standard)
- **Start Purchase Process** (solid green)

## Error Handling

### API Failures
```typescript
try {
  const details = await fetchVehicleListingByVIN(vin);
  if (!details) {
    // Fallback: Show car info without listing details
  }
} catch (error) {
  console.error("Error fetching listing:", error);
  // Graceful degradation: Modal still works with basic car data
}
```

### Missing Data
- All fields are optional
- UI conditionally renders based on availability
- Graceful "N/A" displays for missing info
- No broken layouts or errors

### Network Issues
- Loading spinner shows during fetch
- Error logged to console (not shown to user)
- Modal displays whatever data is available
- User can still proceed with basic car info

## Performance Optimizations

### 1. Lazy Loading
- Listing details only fetched when modal opens
- Not fetched during initial swipe/card render
- Reduces unnecessary API calls

### 2. Smart Caching
- Once fetched, never fetched again for same car
- Persists to localStorage
- Survives page refreshes

### 3. Parallel Loading
- Modal opens immediately
- Data loads in background
- UI updates progressively

### 4. Conditional Rendering
- Only render sections with data
- Skip empty sections
- Faster rendering, cleaner UI

## Testing

### Manual Testing

1. **Swipe Page Modal:**
   ```bash
   # Navigate to swipe page
   # Tap any car card
   # Verify modal opens with loading spinner
   # Wait for Auto.dev data to load
   # Verify all sections appear correctly
   # Click "View Full Listing"
   # Verify dealer website opens in new tab
   ```

2. **Liked Page Modal:**
   ```bash
   # Like several cars from swipe page
   # Navigate to Liked page
   # Click any car card
   # Verify modal opens instantly (if cached)
   # Verify all detailed information displays
   # Click "Start Purchase Process"
   # Verify navigation to Purchase page
   ```

3. **Caching:**
   ```bash
   # Open car modal once (fetches from API)
   # Close modal
   # Open same car modal again
   # Verify instant display (no loading)
   # Refresh page
   # Open car modal again
   # Verify still instant (localStorage)
   ```

### Console Logging

When modals open, check console for:
```
✓ Fetching listing details for VIN...
✓ Found listing from Auto.dev
✓ Cached listing details
```

### Network Tab

- First modal open: POST to `/api/listings`
- Subsequent opens: No API call (cached)

## Limitations & Future Enhancements

### Current Limitations
- **VIN Availability:** Most cars from search agent don't have VINs
- **Search Accuracy:** Year/make/model search may return multiple results
- **Regional Availability:** Limited to dealers in Auto.dev database
- **Real-Time Pricing:** Prices may be stale

### Planned Enhancements

1. **VIN Input Field**
   - Allow users to manually enter VIN
   - Override automatic lookup
   - Better accuracy for specific listings

2. **Image Gallery**
   - Swipeable image carousel
   - Multiple photos from listing
   - Zoom functionality

3. **Listing Comparison**
   - Compare multiple listings for same car
   - Price differences
   - Dealer ratings

4. **Saved Searches**
   - Alert when new listings match criteria
   - Price drop notifications
   - Inventory changes

5. **Dealer Reviews**
   - Integrate dealer ratings
   - Customer reviews
   - Response time metrics

## API Rate Limits

### Auto.dev Free Tier
- **Requests:** 1,000 per month
- **Rate:** 10 per minute
- **Data:** Full listing access

### Optimization Strategies
- Cache all fetched data
- Only fetch on user action (modal open)
- Reuse cached data across sessions
- Batch requests when possible

## Troubleshooting

### Modal Not Opening
- Check console for errors
- Verify card click handlers
- Test with `onClick` console.log

### No Listing Data
- Verify API key in `.env`
- Check network tab for 401/403 errors
- Confirm Auto.dev API status
- Try VIN lookup vs. search

### Slow Loading
- Check network connection
- Verify API response time
- Consider caching strategy
- Check for large images

### Missing Information
- Some listings have incomplete data
- Auto.dev database may not have all specs
- Use fallback to car search data
- Display "N/A" gracefully

## Resources

- **Auto.dev Docs:** https://docs.auto.dev/v2/products/vehicle-listings
- **API Reference:** https://docs.auto.dev/api-reference
- **Dashboard:** https://auto.dev/dashboard
- **Support:** support@auto.dev

## Related Files

- `/frontend/src/lib/autodev-api.ts` - API utility functions
- `/frontend/src/pages/Swipe.tsx` - Swipe modal integration
- `/frontend/src/pages/Liked.tsx` - Liked modal integration
- `/frontend/src/pages/Purchase.tsx` - Listing URL usage
- `/frontend/.env.example` - Environment variable template
- `/AUTODEV_INTEGRATION.md` - This documentation
