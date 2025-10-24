# Fixes Applied - Google Analytics & Sheets API

## Issues Fixed

### 1. ❌ Google Analytics CSP Errors
**Problem**: CSP was blocking `region1.google-analytics.com` and other regional endpoints

**Error**:
```
Refused to connect to 'https://region1.google-analytics.com/...' 
because it violates the following Content Security Policy directive: 
"connect-src 'self' https://www.google-analytics.com"
```

**Solution**: Updated CSP to allow wildcard Google Analytics domains
- Changed: `https://www.google-analytics.com` 
- To: `https://*.google-analytics.com https://*.analytics.google.com`
- Updated in both `next.config.js` and `vercel.json`

### 2. ❌ Google Sheets API 405 Error
**Problem**: API route returning 405 Method Not Allowed

**Error**:
```
Failed to load resource: the server responded with a status of 405
Error saving to sheet: SyntaxError: Failed to execute 'json' on 'Response'
```

**Root Cause**: `output: 'export'` in `next.config.js` creates a **static site** which doesn't support API routes

**Solution**: Removed static export to enable server-side API routes
- Removed: `output: 'export'` from `next.config.js`
- This allows Next.js API routes to work on Vercel

---

## Files Modified

### 1. `next.config.js`
✅ Removed `output: 'export'` line
✅ Updated CSP `connect-src` to include wildcard Google Analytics domains

### 2. `vercel.json`
✅ Updated CSP header to include wildcard Google Analytics domains

---

## What This Means for Deployment

### Before (Static Export):
- ❌ No API routes (Google Sheets saving didn't work)
- ✅ Faster builds
- ✅ Can host on any static hosting

### After (Dynamic Next.js App):
- ✅ API routes work (Google Sheets saving works!)
- ✅ Full Next.js features available
- ✅ Still fast on Vercel's Edge Network
- ℹ️ Must deploy on Vercel or serverless platform

---

## Next Steps

1. **Push changes to GitHub**:
   ```bash
   git add .
   git commit -m "Fix: Remove static export and update CSP for Google Analytics"
   git push origin main
   ```

2. **Redeploy on Vercel**:
   - Vercel will auto-deploy from GitHub
   - OR manually trigger deployment in Vercel dashboard

3. **Verify fixes**:
   - ✅ Google Analytics should track without CSP errors
   - ✅ Cookie consent → form submission → should save to Google Sheet
   - ✅ Check Vercel function logs if issues persist

4. **Check browser console**:
   - Should see no CSP errors for Google Analytics
   - Should see successful API responses from `/api/appendResponse`

---

## Testing Checklist

After deployment:

- [ ] Open browser console (F12)
- [ ] Navigate through the app
- [ ] Check for CSP errors (should be none for Google Analytics)
- [ ] Accept cookies
- [ ] Complete the questionnaire
- [ ] Submit the form
- [ ] Check browser Network tab for `/api/appendResponse` (should be 200 OK)
- [ ] Verify row appears in Google Sheet
- [ ] Check Vercel function logs for any errors

---

## Important Notes

### Environment Variables
Make sure these are set in **Vercel Dashboard** → **Settings** → **Environment Variables**:
- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY` (with actual newlines, not `\n`)
- `GOOGLE_SHEET_ID`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### Google Sheet Permissions
Ensure service account email has **Editor** access to the sheet.

### Google Sheets API
Make sure Google Sheets API is enabled in Google Cloud Console.

---

## If Issues Persist

### Google Analytics still blocked:
- Check browser console for exact CSP error
- Verify `vercel.json` deployed correctly
- Try hard refresh (Ctrl+Shift+R)

### Google Sheets still 405:
- Verify deployment shows `.next` folder (not `out`)
- Check Vercel function logs
- Ensure API route exists at `src/app/api/appendResponse/route.ts`

### Function timeout or errors:
- Check Vercel function logs
- Verify environment variables are set correctly
- Test with console logging in the API route
