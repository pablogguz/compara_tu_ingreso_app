# 🚀 Vercel Deployment Guide

## Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Google Cloud Project**: Set up for Sheets API (if saving responses)

---

## 📋 Step-by-Step Deployment

### 1. **Set Up Google Sheets API** (for saving user responses)

#### Create Service Account:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API**
4. Go to **Credentials** → **Create Credentials** → **Service Account**
5. Create a key (JSON format) and download it
6. From the JSON file, extract:
   - `client_email`
   - `private_key`

#### Share Google Sheet:
1. Open your Google Sheet: `REDACTED_SHEET_ID`
2. Click **Share**
3. Add the `client_email` from service account with **Editor** access
4. The sheet should have columns: `timestamp, municipality, monthly_income, adults, children, perceived_percentile, actual_percentile, equiv_income`

### 2. **Set Up Google Analytics** (optional)

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create GA4 property
3. Copy your Measurement ID (format: `G-XXXXXXXXXX`)

---

## 🔧 Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Import Project**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **Import Git Repository**
   - Select your `compara_tu_ingreso_app` repository

2. **Configure Project**:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

3. **Add Environment Variables**:
   Click **Environment Variables** and add:

   ```env
   # Required for Google Sheets
   GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   
   GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
   YOUR_PRIVATE_KEY_HERE_WITH_NEWLINES
   -----END PRIVATE KEY-----
   
   GOOGLE_SHEET_ID=REDACTED_SHEET_ID
   
   # Optional for Analytics
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-Y8KGPP8Z00
   ```

   **Important Notes**:
   - For `GOOGLE_SHEETS_PRIVATE_KEY`: Copy the entire key including headers/footers
   - The newlines (`\n`) should be actual newlines in Vercel's interface
   - Select **Production, Preview, Development** for all variables
   - Click **Add** for each variable

4. **Deploy**:
   - Click **Deploy**
   - Wait 2-3 minutes for build to complete
   - Your app will be live at `your-project.vercel.app`

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variables via CLI
vercel env add GOOGLE_SHEETS_CLIENT_EMAIL
vercel env add GOOGLE_SHEETS_PRIVATE_KEY
vercel env add GOOGLE_SHEET_ID
vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID

# Deploy to production
vercel --prod
```

---

## ✅ Post-Deployment Checklist

### 1. **Test Core Functionality**
- [ ] Landing page loads
- [ ] Cookie banner appears (if no consent stored)
- [ ] All 4 question steps work
- [ ] Results page displays correctly
- [ ] Charts render properly
- [ ] Municipality dropdown loads all options

### 2. **Test Google Sheets Integration**
- [ ] Accept cookies
- [ ] Complete the questionnaire
- [ ] Check Google Sheet for new row with your data
- [ ] Verify all 8 columns are populated

### 3. **Test Social Media Sharing**
Use these tools to verify your social media card:
- Twitter: [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- Facebook: [Facebook Debugger](https://developers.facebook.com/tools/debug/)
- LinkedIn: [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

Expected preview:
- Title: "Compara tu ingreso"
- Description: "Compara tus ingresos con los del resto de hogares en España..."
- Image: Your `card_teaser.png` (should be 1200x630px)

### 4. **Test Performance**
- [ ] Check Lighthouse score (target: 90+)
- [ ] Test on mobile devices
- [ ] Verify municipality dropdown scrolls smoothly
- [ ] Check data files load quickly

### 5. **Monitor Analytics** (if GA enabled)
- [ ] Go to Google Analytics dashboard
- [ ] Verify real-time events show up when you use the app
- [ ] Check cookie consent is respected

---

## 🔒 Security Best Practices

### Already Implemented ✅
- Environment variables not committed to Git (`.env` in `.gitignore`)
- Google Sheets API uses server-side route (`/api/appendResponse`)
- Private key never exposed to browser
- Cookie consent before analytics

### Additional Recommendations
1. **Rate Limiting**: Consider adding rate limits to `/api/appendResponse` to prevent spam
2. **CORS**: Already handled by Next.js API routes
3. **Data Validation**: API validates data before saving to sheet

---

## 🐛 Common Issues & Solutions

### Issue: "Error appending to sheet"
**Solution**: 
- Verify service account email has Editor access to sheet
- Check `GOOGLE_SHEETS_PRIVATE_KEY` includes full key with newlines
- Ensure sheet ID matches your Google Sheet

### Issue: Cookie banner not showing
**Solution**: Fixed! Clear localStorage and refresh:
```javascript
localStorage.clear()
location.reload()
```

### Issue: Build fails with "Module not found"
**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### Issue: Analytics not tracking
**Solution**:
- Verify `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set
- Accept cookies in the banner
- Check browser console for errors
- Verify GA4 property is active

### Issue: Data files 404
**Solution**:
- Ensure `public/data/` folder exists
- Run `Rscript scripts/convert-data.R` to generate Arrow files
- Verify files are committed to Git

---

## 🔄 Updating Your Deployment

### Automatic Deployments (Recommended)
Vercel automatically deploys when you push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

### Manual Deployments
```bash
vercel --prod
```

---

## 📊 Monitoring Your App

### Vercel Dashboard
- **Analytics**: View visitor stats
- **Logs**: Check function execution logs
- **Speed Insights**: Monitor performance

### Google Sheets
- Monitor responses in real-time
- Export data for analysis

### Google Analytics (if enabled)
- Track user behavior
- Analyze conversion rates
- Monitor popular pages

---

## 🎨 Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `comparatuingreso.es`)
3. Configure DNS records as shown
4. Wait for SSL certificate (automatic, ~1 hour)
5. Update social media cards with new domain

---

## 📞 Need Help?

- **Vercel Docs**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **GitHub Issues**: Open an issue in your repository
- **Vercel Support**: Available in dashboard for Pro plans

---

## 🎉 You're Done!

Your app is now live and ready to share! 🚀

Test URL: `https://your-project.vercel.app`
