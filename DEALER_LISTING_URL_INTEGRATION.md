# Dealer Listing URL Integration Guide

## Overview
The CarTender app now fetches **actual dealer listing URLs** from the Auto.dev API instead of using generic Google search links. This allows users to go directly to the dealer's website to view the specific car listing.

## How It Works

### 1. Backend: Extract Listing URL from Auto.dev API

**File**: `/backend/app/services/auto_dev.py`

The backend now extracts the `url` field from the Auto.dev API response:

```python
# Extract dealer listing URL - CRITICAL for linking to actual dealer page
listing_url = (
    retail.get("url") or 
    retail.get("link") or 
    details.get("url") or 
    details.get("link") or
    None
)
logger.info(f"Dealer listing URL: {listing_url}")

# Add to result
result = {
    # ...other fields...
    "url": listing_url,  # Add the actual dealer listing URL
    "vin": details.get("vin"),
    # ...more fields...
}
```

**Key Points**:
- Tries multiple fields: `retail.url`, `retail.link`, `details.url`, `details.link`
- Logs the URL for debugging
- Stores in the `url` field of the car object

### 2. Frontend: Auto.dev API Client

**File**: `/frontend/src/lib/autodev-api.ts`

The frontend has three main functions for fetching dealer listings:

#### a) Fetch by VIN
```typescript
export async function fetchVehicleListingByVIN(vin: string): Promise<VehicleListingDetails | null>
```

**Endpoint**: `GET https://api.auto.dev/listings?vin={vin}`

**Example**:
```typescript
const listing = await fetchVehicleListingByVIN('1HGCM82633A123456');
console.log(listing?.listingUrl); // https://www.dealer.com/inventory/123
```

#### b) Search by Year/Make/Model
```typescript
export async function searchVehicleListings(
  year: number,
  make: string,
  model: string,
  zipcode?: string,
  radius: number = 50
): Promise<VehicleListingDetails[]>
```

**Endpoint**: `GET https://api.auto.dev/listings?year={year}&make={make}&model={model}&zipcode={zip}&radius={radius}`

**Example**:
```typescript
const listings = await searchVehicleListings(2023, 'Toyota', 'Camry', '75080', 50);
listings.forEach(l => console.log(l.listingUrl));
```

#### c) Get Actual Listing URL (Hybrid Approach)
```typescript
export async function fetchActualListingUrl(car, zipcode?): Promise<string | null>
```

**Strategy**:
1. Try VIN lookup first (if VIN available)
2. Fall back to year/make/model search
3. Return first listing URL found
4. Fall back to original URL if nothing found

**Example**:
```typescript
const actualUrl = await fetchActualListingUrl({
  year: 2023,
  make: 'Toyota',
  model: 'Camry',
  vin: '1HGCM82633A123456',
  url: 'https://google.com/search?q=...' // fallback
}, '75080');

console.log(actualUrl); // https://www.dealer.com/inventory/123
```

### 3. Purchase Page Integration

**File**: `/frontend/src/pages/Purchase.tsx`

The Purchase page uses the `handleViewDealerListing` function to fetch and open the actual dealer URL:

```typescript
const handleViewDealerListing = async () => {
  if (!car) return;
  
  // If we already have the actual listing URL cached, open it
  if (car.actualListingUrl) {
    window.open(car.actualListingUrl, '_blank');
    return;
  }
  
  // Otherwise, fetch it from Auto.dev API
  setLoadingDealerListing(true);
  toast({ title: "Finding Dealer Listing", description: "Fetching the actual dealer posting URL..." });
  
  try {
    const actualUrl = await fetchActualListingUrl(
      {
        year: car.year,
        make: car.make,
        model: car.model,
        vin: car.vin,
        url: car.url,
      },
      financePrefs?.zipcode
    );
    
    if (actualUrl) {
      // Cache the actual URL in the car object
      car.actualListingUrl = actualUrl;
      
      // Update localStorage
      const likedCars = JSON.parse(localStorage.getItem('likedCars') || '[]');
      const carIndex = likedCars.findIndex(c => 
        c.year === car.year && c.make === car.make && c.model === car.model
      );
      if (carIndex !== -1) {
        likedCars[carIndex].actualListingUrl = actualUrl;
        localStorage.setItem('likedCars', JSON.stringify(likedCars));
      }
      
      // Open the actual listing URL
      window.open(actualUrl, '_blank');
      toast({ title: "Dealer Listing Found", description: "Opening the actual dealer posting..." });
    } else {
      // Fallback to Google search
      const fallbackUrl = car.url || `https://www.google.com/search?q=${car.year}+${car.make}+${car.model}+for+sale`;
      window.open(fallbackUrl, '_blank');
      toast({ title: "Using Search Results", description: "Could not find the exact dealer listing." });
    }
  } catch (error) {
    console.error("Error fetching dealer listing:", error);
    // Fallback to Google search
    const fallbackUrl = car.url || `https://www.google.com/search?q=${car.year}+${car.make}+${car.model}+for+sale`;
    window.open(fallbackUrl, '_blank');
  } finally {
    setLoadingDealerListing(false);
  }
};
```

**Key Features**:
- ✅ Caches the actual URL in `car.actualListingUrl`
- ✅ Persists to localStorage for future use
- ✅ Shows loading state with spinner
- ✅ Toast notifications for user feedback
- ✅ Graceful fallback to Google search if not found

### 4. Button UI with Loading State

```tsx
<Button 
  className="w-full mt-4" 
  onClick={handleViewDealerListing}
  disabled={loadingDealerListing}
>
  {loadingDealerListing ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Finding Listing...
    </>
  ) : (
    <>
      <ExternalLink className="w-4 h-4 mr-2" />
      View Dealer Listing
    </>
  )}
</Button>
```

## Auto.dev API Response Format

### Typical Response Structure

```json
{
  "data": [
    {
      "vin": "1HGCM82633A123456",
      "vehicle": {
        "year": 2023,
        "make": "Honda",
        "model": "Accord",
        "trim": "EX-L",
        "transmission": "Automatic",
        "drivetrain": "FWD",
        "engine": "1.5L Turbo",
        "horsepower": 192,
        "mpgCity": 30,
        "mpgHighway": 38
      },
      "retailListing": {
        "price": 28500,
        "mileage": 15000,
        "url": "https://www.dealer.com/inventory/honda-accord-123",
        "dealer": "Honda of Dallas",
        "phone": "(123) 456-7890",
        "address": "123 Main St, Dallas, TX 75001"
      },
      "images": [
        "https://cdn.auto.dev/photos/123.jpg",
        "https://cdn.auto.dev/photos/456.jpg"
      ],
      "features": ["Sunroof", "Leather Seats", "Navigation"]
    }
  ]
}
```

### Field Mapping

| Auto.dev Field | Car Object Field | Notes |
|----------------|------------------|-------|
| `retailListing.url` | `url` | Primary dealer listing URL |
| `retailListing.link` | `url` | Alternative field name |
| `vin` | `vin` | Vehicle Identification Number |
| `vehicle.year` | `year` | Year |
| `vehicle.make` | `make` | Make |
| `vehicle.model` | `model` | Model |
| `retailListing.price` | `price.marketValue` | Price |
| `images` | `photos` | Photo URLs |

## Debugging

### Enable Console Logging

The Auto.dev API client includes comprehensive logging:

```typescript
console.log(`🔍 Fetching listing for VIN: ${vin}`);
console.log('Auto.dev API response:', data);
console.log('✓ Parsed listing URL:', result.listingUrl);
```

### Check Network Requests

In Chrome DevTools:
1. Open **Network** tab
2. Filter by `api.auto.dev`
3. Click on request to see:
   - Request headers (check Authorization)
   - Response body (check for `url` field)
   - Status code (should be 200)

### Common Issues

#### 1. No Listing URL Returned
**Problem**: Auto.dev API returns listings but no `url` field

**Solution**: Check response structure. The URL might be in:
- `retailListing.url`
- `retailListing.link`
- `data.url`
- `data.link`

#### 2. API Key Invalid
**Problem**: 401 Unauthorized error

**Solution**: Check `.env` file:
```bash
VITE_AUTODEV_API_KEY=your_actual_api_key_here
```

#### 3. VIN Not Found
**Problem**: Backend doesn't extract VIN

**Solution**: Check backend logs:
```python
logger.info(f"VIN: {vin}")
```

If VIN is null, the Auto.dev listings endpoint might not be returning it.

#### 4. CORS Errors
**Problem**: Browser blocks Auto.dev API requests

**Solution**: Auto.dev API should have CORS enabled. If not, proxy through backend.

## Testing

### Test VIN Lookup
```typescript
// In browser console
const { fetchVehicleListingByVIN } = await import('./lib/autodev-api');
const listing = await fetchVehicleListingByVIN('1HGCM82633A123456');
console.log('Listing URL:', listing?.listingUrl);
```

### Test Year/Make/Model Search
```typescript
const { searchVehicleListings } = await import('./lib/autodev-api');
const listings = await searchVehicleListings(2023, 'Toyota', 'Camry', '75080', 50);
console.log('Found listings:', listings.length);
listings.forEach((l, i) => console.log(`${i + 1}. ${l.listingUrl}`));
```

### Test Purchase Page Integration
1. Navigate to any car's Purchase page
2. Open browser console
3. Click "View Dealer Listing"
4. Check console logs:
   ```
   🔗 Fetching actual listing URL for: 2023 Toyota Camry
      VIN: 1HGCM82633A123456, Zipcode: 75080
      Trying VIN lookup: 1HGCM82633A123456
      ✓ Found actual listing URL via VIN: https://dealer.com/...
   ```

## Performance

### Caching Strategy

1. **First Click**: Fetch from Auto.dev API (~500-1000ms)
2. **Subsequent Clicks**: Use cached `car.actualListingUrl` (instant)
3. **Persistence**: Stored in localStorage across page reloads

### Optimization Tips

- VIN lookup is faster than year/make/model search
- Cache results in car object to avoid redundant API calls
- Use loading states to provide user feedback

## Future Enhancements

### 1. Backend Proxy
Instead of calling Auto.dev directly from frontend, proxy through backend:
```python
@app.route('/api/listing-url/<vin>')
def get_listing_url(vin):
    # Fetch from Auto.dev and cache in Redis
    return jsonify({'url': listing_url})
```

### 2. Batch Lookup
Fetch listing URLs for all liked cars at once:
```typescript
async function batchFetchListingUrls(cars: Car[]) {
  const promises = cars.map(car => fetchActualListingUrl(car));
  const urls = await Promise.all(promises);
  // Update all cars with actual URLs
}
```

### 3. Fallback to Other Sources
If Auto.dev doesn't have the listing, try:
- CarGurus API
- Autotrader API
- Cars.com API

## Summary

✅ **Backend** extracts `url` from Auto.dev API response
✅ **Frontend** provides three methods to fetch listing URLs
✅ **Purchase page** fetches and caches actual dealer URLs
✅ **Graceful fallbacks** to Google search if not found
✅ **Comprehensive logging** for debugging
✅ **Loading states** for better UX

The dealer listing URL integration ensures users can go directly to the actual dealer website instead of searching on Google!
