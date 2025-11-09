# Auto.dev Integration - Quick Start Guide

## 🎯 What This Does

Adds **real vehicle listing data** to your Swipe and Liked pages using Auto.dev's API. Users can now:
- Tap/click any car card to see detailed information
- View real dealer pricing, specs, photos, and features
- Get dealer contact information
- Click through to actual dealer websites

## 🚀 Setup (2 minutes)

### Step 1: Get API Key
1. Go to https://auto.dev
2. Sign up for a free account
3. Navigate to "API Keys" in dashboard
4. Copy your API key

### Step 2: Add to Environment
```bash
cd frontend
echo "VITE_AUTODEV_API_KEY=your_api_key_here" > .env
```

Replace `your_api_key_here` with your actual key.

### Step 3: Restart Dev Server
```bash
npm run dev
```

That's it! 🎉

## ✨ How to Use

### On Swipe Page
1. Navigate to `/swipe`
2. **Tap any car card**
3. Modal opens with detailed info
4. Click "View Full Listing" to see dealer website
5. Click "Like" to save to favorites

### On Liked Page
1. Navigate to `/liked`
2. **Click any saved car**
3. Modal opens with detailed info (instant if cached)
4. Click "Start Purchase Process" to begin buying

## 📊 What Data You Get

### Basic Info
- ✅ Real-time pricing from dealers
- ✅ Actual mileage
- ✅ Transmission type
- ✅ Drivetrain (FWD, AWD, RWD)
- ✅ Fuel type

### Performance
- ✅ Engine specifications
- ✅ Horsepower
- ✅ Torque
- ✅ MPG (city/highway)

### Appearance
- ✅ Exterior color
- ✅ Interior color
- ✅ Multiple photos

### Features & Dealer
- ✅ Complete feature list
- ✅ Description from dealer
- ✅ Dealer name, address, phone
- ✅ Direct link to listing

## 🎨 UI Components Added

### Swipe Page
- Modal with scrollable content
- "Tap for details" indicator on cards
- Loading spinner while fetching
- Pass/Like buttons in modal

### Liked Page
- Modal with scrollable content
- Clickable cards
- Agent research integration
- Purchase process button

## 🔧 Technical Details

### Files Created
- `/frontend/src/lib/autodev-api.ts` - API functions
- `/frontend/.env.example` - Environment template

### Files Modified
- `/frontend/src/pages/Swipe.tsx` - Added modal
- `/frontend/src/pages/Liked.tsx` - Added modal

### Caching
- First view: Fetches from API (~2 seconds)
- Return view: Instant (cached)
- Persists across page refreshes

## 🐛 Troubleshooting

### "No data in modal"
→ Check your API key in `.env` file

### "Modal won't open"
→ Check browser console for errors

### "Slow loading"
→ Normal for first load, instant after caching

### "401 Unauthorized"
→ API key is incorrect or missing

## 📚 More Info

See `/AUTODEV_INTEGRATION.md` for complete documentation.

## ✅ Testing Checklist

- [ ] Modal opens on card tap/click
- [ ] Loading spinner shows
- [ ] Data appears after ~2 seconds
- [ ] Second open is instant (cached)
- [ ] "View Full Listing" opens dealer site
- [ ] All sections render correctly

---

**Need Help?** Check the full documentation in `AUTODEV_INTEGRATION.md`
