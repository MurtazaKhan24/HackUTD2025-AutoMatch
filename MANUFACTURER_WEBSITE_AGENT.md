# Manufacturer Website Agent

## Overview
This document describes the manufacturer website agent implemented in the Purchase workflow to replace the unreliable dealer listing button.

## Implementation

### Location
- **File**: `frontend/src/pages/Purchase.tsx`
- **Function**: `handleViewManufacturerSite()`

### Functionality
The agent provides a simple, reliable way for users to learn more about the vehicle they're interested in by:

1. **Primary Behavior**: Opening the manufacturer's official website based on the car's make
   - Maps 45+ common car manufacturers to their official U.S. websites
   - Covers all major brands (Toyota, Honda, Ford, BMW, Tesla, etc.)
   - Uses normalized, case-insensitive matching

2. **Fallback Behavior**: If the manufacturer is not recognized:
   - Opens a Google search for the specific car (year, make, model)
   - Uses `encodeURIComponent` to safely handle special characters in search queries
   - Provides a helpful toast notification

### Manufacturer Mapping
The agent includes mappings for:
- **Mass Market**: Toyota, Honda, Ford, Chevrolet, Nissan, Mazda, Hyundai, Kia, Volkswagen, Subaru
- **Luxury**: BMW, Mercedes-Benz, Audi, Lexus, Acura, Infiniti, Cadillac, Lincoln, Genesis
- **Performance/Exotic**: Porsche, Tesla, Ferrari, Lamborghini, McLaren, Aston Martin, Lotus
- **Specialty**: Jeep, Ram, Dodge, Chrysler, GMC, Buick, Mini, Volvo, Jaguar, Land Rover, Fiat, Alfa Romeo, Maserati, Bentley, Rolls-Royce, Mitsubishi

### User Experience
- **Button Text**: "Visit {Make} Website" (e.g., "Visit Toyota Website")
- **Icon**: External link icon to indicate opening a new tab
- **Toast Notifications**:
  - Success: "Opening Manufacturer Website - Visit {Make}'s official website for more information."
  - Fallback: "Searching Online - Finding more information about the {Year} {Make} {Model}."

## Removed Functionality
The following dealer listing features were removed as they were unreliable:
- `fetchActualListingUrl` import from `@/lib/autodev-api`
- `loadingDealerListing` state variable
- `handleViewDealerListing` async function with Auto.dev API integration
- Dealer listing URL caching logic
- Loading states and spinners for dealer listing fetch

## Benefits
1. **Reliability**: No API calls or external dependencies that could fail
2. **Performance**: Instant response, no loading states
3. **Simplicity**: Clear, predictable behavior for users
4. **Maintainability**: Easy to extend with more manufacturers
5. **User Trust**: Direct link to official manufacturer sites

## Future Enhancements
Potential improvements to consider:
1. Add more niche/luxury manufacturers to the mapping
2. Support international domains based on user location
3. Add deep links to specific model pages if available
4. Track which manufacturers are most commonly searched to improve coverage
5. Integrate with a manufacturer API if one becomes available

## Testing
To test the agent:
1. Navigate to the Purchase page with any car
2. Click the "Visit {Make} Website" button
3. Verify:
   - For common makes (Toyota, Honda, etc.): Official website opens
   - For uncommon makes: Google search opens with correct query
   - Toast notifications appear with appropriate messages
   - Button responds immediately without loading states

## Related Files
- `/frontend/src/pages/Purchase.tsx` - Main implementation
- `/frontend/src/lib/autodev-api.ts` - Contains unused dealer listing API client (can be removed if not used elsewhere)
- `/backend/app/services/auto_dev.py` - Contains unused dealer listing extraction logic (can be removed if not used elsewhere)

## Migration Notes
- No database changes required
- No backend changes required
- Frontend-only implementation
- Compatible with existing car data structure
- No breaking changes to user experience
