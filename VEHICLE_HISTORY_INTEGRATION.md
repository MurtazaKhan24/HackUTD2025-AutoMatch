# Vehicle History Integration

## Overview
Integrated free NHTSA (National Highway Traffic Safety Administration) API for recalls and safety complaints, plus direct links to CARFAX and AutoCheck for full vehicle history reports.

## Features

### 1. **Free Government Data (NHTSA API)**
- ✅ **Recalls**: Active recalls for the specific year/make/model
- ✅ **Complaints**: Consumer complaints submitted to NHTSA
- ✅ **Safety Ratings**: Links to NHTSA safety information
- ✅ **No API Key Required**: Completely free to use

### 2. **Direct Links to Paid Services**
- 🔗 **CARFAX**: Direct link with VIN pre-filled (if VIN available)
- 🔗 **AutoCheck**: Alternative vehicle history report service
- 🔗 **NHTSA**: Government safety information page

## API Endpoints

### Get Vehicle History
```
POST /api/vehicle-history/report
```

**Request Body:**
```json
{
  "vin": "1HGBH41JXMN109186",  // Optional: 17-character VIN
  "year": "2020",               // Required if no VIN
  "make": "Toyota",             // Required if no VIN
  "model": "Camry"              // Required if no VIN
}
```

**Response:**
```json
{
  "recalls": [
    {
      "date": "2021-03-15",
      "component": "ENGINE",
      "summary": "Engine may stall unexpectedly...",
      "consequence": "May result in loss of motive power...",
      "remedy": "Dealers will replace the fuel pump..."
    }
  ],
  "complaints": [
    {
      "component": "ENGINE",
      "count": 45
    }
  ],
  "total_complaints": 127,
  "safety_ratings": null,
  "links": {
    "carfax": "https://www.carfax.com/VehicleHistory/p/Report.cfx?vin=...",
    "autocheck": "https://www.autocheck.com/vehiclehistory/?vin=...",
    "nhtsa": "https://www.nhtsa.gov/vehicle/2020/Toyota/Camry"
  },
  "summary": "Found 3 active recall(s) for this vehicle. 127 consumer complaints reported to NHTSA..."
}
```

### Decode VIN
```
POST /api/vehicle-history/decode-vin
```

**Request Body:**
```json
{
  "vin": "1HGBH41JXMN109186"
}
```

**Response:**
```json
{
  "Make": "Honda",
  "Model": "Accord",
  "Model Year": "1991",
  "Vehicle Type": "PASSENGER CAR",
  "Body Class": "Sedan/Saloon",
  "Fuel Type - Primary": "Gasoline",
  "Transmission Style": "Manual",
  "Drive Type": "FWD"
}
```

## Frontend Integration

### Button States
1. **Initial**: "Get Vehicle History Report" (enabled)
2. **Loading**: "🔄 Checking..." (disabled)
3. **Loaded**: "✓ Report Loaded" (disabled, grayed)

### Display Sections

#### 1. Recalls (Red Alert)
- Shows number of active recalls
- Lists recall details (component, summary, risk, remedy)
- Collapsible dropdown (shows 2, expand to show all)
- Red-themed warning UI

#### 2. Complaints (Yellow Warning)
- Total number of complaints
- Top 3 complaint categories with counts
- Yellow-themed caution UI

#### 3. External Report Links
- CARFAX Report button (opens in new tab)
- AutoCheck Report button (opens in new tab)
- NHTSA Safety Info button (opens in new tab)

### Data Persistence
- Saved to localStorage: `vehicle_history_{year}_{make}_{model}`
- Loads automatically when returning to Purchase page
- Button shows "✓ Report Loaded" when data exists

## NHTSA API Details

### Endpoints Used

1. **Recalls by Vehicle**
   ```
   https://api.nhtsa.gov/recalls/recallsByVehicle?make={make}&model={model}&modelYear={year}
   ```

2. **Complaints by Vehicle**
   ```
   https://api.nhtsa.gov/complaints/complaintsByVehicle?make={make}&model={model}&modelYear={year}
   ```

3. **VIN Decoder**
   ```
   https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json
   ```

### Rate Limits
- ✅ No authentication required
- ✅ No rate limits (as of 2025)
- ✅ Completely free

### Data Coverage
- **Recalls**: All active and some resolved recalls
- **Complaints**: Consumer complaints from ODI database
- **Safety**: NCAP crash test ratings (not yet integrated)
- **Coverage**: All vehicles sold in the US

## User Experience

### With Recalls Found
1. User clicks "Get Vehicle History Report"
2. Loading spinner appears
3. Red alert box appears showing recalls
4. Toast notification: "Found 3 recall(s) for this vehicle" (red/destructive)
5. User can expand to see all recall details
6. Links to CARFAX, AutoCheck, and NHTSA provided

### Without Recalls
1. User clicks button
2. Green success message: "No active recalls found"
3. May still show complaints if any exist
4. Links still provided for full history reports

## Comparison: Free vs Paid Reports

### Free (NHTSA) ✅
- Active recalls
- Consumer complaints
- Safety ratings (basic)
- Manufacturing defects
- **Cost**: $0

### Paid (CARFAX/AutoCheck) 💰
- Accident history
- Ownership history
- Service records
- Odometer readings
- Title information
- Flood damage
- Salvage/rebuilt status
- **Cost**: ~$40-60 per report

### Recommendation
Use the **free NHTSA data first** to check for major safety issues, then purchase a CARFAX/AutoCheck report if serious about buying the vehicle.

## Implementation Notes

### Why This Approach?
1. **Cost-Effective**: NHTSA data is free and valuable
2. **Immediate Value**: Users get safety information instantly
3. **Upsell Path**: Links to paid services if they want more
4. **Legal**: No scraping, no API violations
5. **Reliable**: Government API with high uptime

### Limitations
- **No VIN**: Most car listings don't include VIN
- **No Accident History**: NHTSA doesn't track accidents
- **No Ownership**: Can't see how many previous owners
- **No Service Records**: No maintenance history

### Future Enhancements
1. **VIN Input**: Allow users to manually enter VIN if available
2. **Safety Ratings**: Integrate NCAP crash test scores
3. **TSB Data**: Technical Service Bulletins (common issues)
4. **Lemon Law**: State lemon law information
5. **Cost Calculator**: Estimate potential recall repair costs

## Testing

### Test Cases
```bash
# Test with recalls (Toyota has many)
curl -X POST http://localhost:5001/api/vehicle-history/report \
  -H "Content-Type: application/json" \
  -d '{"year": "2018", "make": "Toyota", "model": "Camry"}'

# Test VIN decoder
curl -X POST http://localhost:5001/api/vehicle-history/decode-vin \
  -H "Content-Type: application/json" \
  -d '{"vin": "1HGBH41JXMN109186"}'
```

### Expected Behavior
- ✅ Recalls load within 2-3 seconds
- ✅ Data persists across navigation
- ✅ Button disables after first fetch
- ✅ External links open in new tabs
- ✅ Error handling for API failures

## Resources

- NHTSA API Docs: https://vpic.nhtsa.dot.gov/api/
- NHTSA Recalls: https://www.nhtsa.gov/recalls
- CARFAX: https://www.carfax.com/
- AutoCheck: https://www.autocheck.com/
