# Compara Tu Ingreso - Modern Web App

A serverless, client-side web application that helps users compare their household income with the Spanish population distribution using administrative tax data (IRPF).

## 🚀 Tech Stack

- **Framework**: Next.js 14 (static export)
- **UI**: React + TypeScript
- **Charts**: Highcharts
- **Data Format**: Apache Arrow (Feather v2)
- **Analytics**: Google Analytics 4 (consent-based)
- **Backend**: Single serverless function for Google Sheets integration

## 📁 Project Structure

```
├── public/
│   ├── data/              # Arrow/Feather data files
│   │   ├── national_percentiles.arrow
│   │   ├── provincial_percentiles.arrow
│   │   ├── mun_percentiles.arrow
│   │   ├── municipality_lookup.arrow
│   │   ├── density_curve.arrow
│   │   ├── density_curve_prov.arrow
│   │   ├── density_curve_mun/
│   │   │   └── mun_*.arrow
│   │   └── municipality_stats.arrow
│   └── css/               # Design system (tokens in styles.css :root)
│       ├── styles.css             # tokens · base · landing · question card · forms · .btn system
│       ├── custom-components.css  # slider · pagas toggle · stat cards · cookie card
│       ├── styles_results.css     # results hero · segmented control · chart · stats row
│       └── help-modal.css         # help FAB + FAQ modal
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       └── appendResponse/
│   │           └── route.ts
│   ├── components/
│   │   ├── LandingPage.tsx
│   │   ├── QuestionFlow.tsx
│   │   ├── ResultsView.tsx
│   │   ├── DistributionChart.tsx
│   │   ├── StatsCards.tsx
│   │   └── CookieBanner.tsx
│   ├── lib/
│   │   ├── calculations.ts
│   │   ├── dataLoader.ts
│   │   └── analytics.ts
│   └── types/
│       └── index.ts
├── scripts/
│   └── convert-data.R        # FST to Arrow conversion
├── next.config.js
├── tsconfig.json
└── package.json
```

## 🛠️ Setup & Development

### Prerequisites

- Node.js 18+
- R (for data conversion)

### Installation

```bash
npm install
```

### Data Conversion

Convert FST files to Arrow format:

```bash
Rscript scripts/convert-data.R
```

This will:
- Read all `.fst` files from `data/`
- Convert to Apache Arrow (Feather v2) format
- Save to `public/data/` with `.arrow` extension
- Preserve all column names and data types

### Environment Variables

Create `.env.local`:

```env
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=your-private-key
GOOGLE_SHEET_ID=REDACTED_SHEET_ID
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-Y8KGPP8Z00
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build & Export

```bash
npm run build
```

Generates static site in `out/` directory ready for deployment.

## 📊 Data Schema

All data files preserve original column names and structure:

### national_percentiles.arrow
- `percentile` (1-100)
- `value` (income at percentile)

### provincial_percentiles.arrow
- `percentile` + columns named by `prov_code`

### mun_percentiles.arrow
- `percentile` + columns named by `mun_code`

### municipality_lookup.arrow
- `mun_code`, `mun_name`, `prov_code`, `prov_name`

### density_curve.arrow
- `x` (income), `y` (density)

### density_curve_prov.arrow
- `prov_code`, `x`, `y`

### density_curve_mun/mun_<prov>.arrow
- `mun_code`, `x`, `y`

### municipality_stats.arrow
- `mun_code`
- `net_income_equiv`, `net_income_equiv_is_imputed`
- `pct_higher_ed_completed`, `pct_higher_ed_completed_is_imputed`
- `pct_foreign_born`, `pct_foreign_born_is_imputed`

## 🔄 Data Refresh Workflow

1. Update FST files in `data/` directory
2. Run conversion script: `Rscript scripts/convert-data.R`
3. Rebuild app: `npm run build`
4. Deploy updated `out/` directory

## 🍪 Privacy & Analytics

- Cookie consent banner on first visit
- Stores choice in `localStorage`
- GA4 loaded **only after** user accepts
- Response data sent to Google Sheets **only if** consent accepted
- All responses stored anonymously

## 🧮 Core Logic

### Equivalised Income Calculation

```typescript
scale = 1 + max(0, adults - 1) * 0.5 + children * 0.3
equiv_income = (monthly_income * 12) / scale
```

### Percentile Finding

```typescript
// Clamp to bounds
if (value <= min) return 1
if (value >= max) return 100
// Find largest p where percentiles[p] <= value
return largest_p
```

### P99 Truncation

- Chart x-axis max = p99 of current view
- If user income > p99, display ">99"

## 📱 Deployment

Suitable for any static hosting:

- **Vercel**: `vercel deploy`
- **Netlify**: Drag `out/` folder
- **GitHub Pages**: Push `out/` to gh-pages branch
- **Cloudflare Pages**: Connect repository

## 🧪 Testing

To verify correctness against Shiny app:

1. Use same test inputs in both apps
2. Compare:
   - Equivalised income calculation
   - National/provincial/municipal percentiles
   - Chart data ranges
   - P99 truncation behavior

## 📄 License

MIT

## 👤 Author

Pablo García Guzmán
- Website: [pablogguz.github.io](https://pablogguz.github.io)
- Twitter: [@pablogguz_](https://twitter.com/pablogguz_)
