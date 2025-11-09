# AutoMatch Setup and Run Guide

## 🔧 Recent Fixes

### Frontend Liked Page Bug - FIXED ✅

**Issue:** White screen on Liked page with TypeError: `Cannot read properties of undefined (reading 'toLocaleString')`

**Root Cause:** The Car interface in `Liked.tsx` didn't match the actual data structure being stored from the Swipe page.

**Solution Applied:**
1. Updated Car interface in `Liked.tsx` to match the actual structure:
   - Changed from flat `price: number` to nested `price: { marketValue?: number }`
   - Added optional `specs` object with transmission, mpg, horsepower, etc.
   - Added `photos`, `url`, `trim`, and other missing fields
   
2. Updated the rendering logic to:
   - Use index-based keys instead of non-existent `id` field
   - Access nested price value: `car.price?.marketValue`
   - Use first photo from array: `car.photos?.[0]`
   - Handle missing/optional fields with fallbacks
   - Add error handling for image loading
   - Display additional info like trim, MPG, horsepower
   - Add "View Listing" button if URL is available

3. Added robust error handling for localStorage parsing
   - Catches parse errors and resets corrupted data
   - Validates that data is an array
   - Shows user-friendly error messages

## 🚀 How to Run the Application

### Prerequisites
- Node.js (for frontend)
- Python 3.8+ (for backend)
- pip (Python package manager)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd /Users/faris/Code/AutoMatch/HackUTD2025-AutoMatch/backend
   ```

2. **Create and activate virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On macOS/Linux
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the backend server:**
   ```bash
   python -m app.main
   ```
   
   The backend will start on `http://localhost:5001`

### Frontend Setup

1. **Open a new terminal and navigate to frontend directory:**
   ```bash
   cd /Users/faris/Code/AutoMatch/HackUTD2025-AutoMatch/frontend
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   # or if you're using bun (faster):
   bun install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   # or with bun:
   bun run dev
   ```
   
   The frontend will start on `http://localhost:5173` (or another port if 5173 is busy)

### Accessing the Application

1. Open your browser to the frontend URL (typically `http://localhost:5173`)
2. Ensure the backend is running on port 5001 (check terminal for "Running on http://127.0.0.1:5001")

## 🐛 Troubleshooting

### "Connection Refused" Error

**Symptom:** API calls fail with ERR_CONNECTION_REFUSED

**Solutions:**
1. Make sure the backend is running on port 5001
2. Check that you're not running another service on port 5001
3. On macOS, AirPlay uses port 5000 - that's why we use 5001
4. Verify the backend logs show: "Running on http://127.0.0.1:5001"

### White Screen or React Errors

**Symptom:** Frontend shows white screen or errors in console

**Solutions:**
1. Clear browser cache and localStorage: Open DevTools → Application → Storage → Clear Site Data
2. Hard refresh: Cmd+Shift+R (macOS) or Ctrl+Shift+R (Windows/Linux)
3. Check browser console for specific errors
4. Make sure you've run `npm install` or `bun install` after pulling new changes

### Backend Import Errors

**Symptom:** `ModuleNotFoundError` when running backend

**Solutions:**
1. Make sure you're in the backend directory
2. Run with: `python -m app.main` (NOT `python app/main.py`)
3. Check that `__init__.py` files exist in all subdirectories
4. Verify virtual environment is activated if you're using one

### Liked Cars Not Showing

**Symptom:** No cars appear on the Liked page even after liking some

**Solutions:**
1. Check browser console for errors
2. Inspect localStorage: DevTools → Application → Local Storage → Check "likedCars" key
3. The data should be a JSON array of car objects
4. If corrupted, clear it and start fresh
5. Make sure you're actually liking cars (swiping right) on the Swipe page

## 📝 Data Structure Reference

### Car Object Structure (as saved to localStorage)

```typescript
interface Car {
  make: string;              // e.g., "Toyota"
  model: string;             // e.g., "Camry"
  year: string | number;     // e.g., 2023
  trim?: string;             // e.g., "XLE"
  price?: {
    marketValue?: number;    // e.g., 28500
  };
  photos?: string[];         // Array of image URLs
  url?: string;              // Listing URL
  source?: string;           // Data source
  specs?: {
    mpg?: string;            // e.g., "28 city / 39 hwy"
    horsepower?: number;     // e.g., 203
    transmission?: string;   // e.g., "Automatic"
    drivetrain?: string;     // e.g., "FWD"
    engine?: string;         // e.g., "2.5L 4-Cylinder"
  };
  features?: string[];       // Array of feature names
  pros?: string[];           // Pros list
  cons?: string[];           // Cons list
  safety_rating?: number;    // Safety rating
  weight?: number;           // Preference weight
}
```

## 🎯 Key Backend Endpoints

- `POST /api/search/suggestions` - Get car suggestions based on preferences
- `POST /api/swipe` - Record swipe interaction
- `GET /api/hello` - Health check
- `GET /api/test-cors` - CORS test endpoint

## 🔄 Current Features

1. **Finance Preferences** - Set budget and payment preferences
2. **Physical Preferences** - Set car type, features, and requirements
3. **Swipe Interface** - Tinder-like car browsing
4. **Liked Cars** - View all cars you've liked (NEWLY FIXED!)
5. **AI-Driven Search** - LLM-powered car recommendations

## ✨ Next Steps / Future Improvements

- [ ] Implement streaming/concurrent API calls for faster car loading
- [ ] Add more detailed car information on Swipe cards
- [ ] Implement filtering on Liked page
- [ ] Add export functionality for liked cars
- [ ] Implement comparison feature for liked cars
- [ ] Add user authentication and save preferences to backend
