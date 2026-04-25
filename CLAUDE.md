# CLAUDE.md

This file orients Claude Code (and any contributor) to the codebase. Read this before making non-trivial changes.

---

## What this app is

**comparatuingreso.es** is a public-facing Spanish-language web tool that places a household's income in the Spanish income distribution. Given a municipality, monthly household income, household composition, and a perceived percentile, it returns:

- The household's actual percentile at three geographic levels (national / provincial / municipal).
- A density curve at the chosen level with the user's position and their *guess* highlighted (national view only).
- Three context cards for the chosen municipality: mean equivalised income, % with higher education, % foreign-born.

It is read-only with a single optional side-effect: with cookie consent, the inputs and results are appended to a Google Sheet for research.

---

## Data pipeline (where the numbers come from)

The frontend ships pre-computed Apache Arrow files in [public/data/](public/data/). Those files are produced by a **separate R repository** that this app is deliberately decoupled from:

```
~/Documents/GitHub/compara_tu_ingreso_validation/code   (R pipeline — separate repo)
        │
        ├── 1. predict_gini_ml.r        # XGBoost imputes missing tract-level Gini
        ├── 2. prep_lognormal.r         # log-normal mixture per tract → percentiles + density
        ├── 3a. mun_stats.r             # municipality demographics (income, edu, foreign-born)
        └── 3b. tract_stats.r           # tract-level outputs (NOT consumed by this app)
        │
        └── data/*.fst                  # FST output
                │
                └── (this repo) scripts/convert-data.R
                        │
                        └── public/data/*.arrow         # Feather v2, no compression
```

### Sources

- **ADRH** (INE *Atlas de Distribución de Renta de los Hogares*, 2023) — net household and equivalised income, Gini, at census-tract / municipal / provincial level. Loaded via the `ineAtlas` R package.
- **Census 2021** (INE) — demographics (population, age, household composition, employment, education, foreign-born share). Loaded via `ineAtlas::get_census()`.
- **wikibarrio** — supplementary education + foreign-born share at municipal level (filled in for missing rows in `mun_stats.r`).

### Method (in 30 seconds)

1. For each of ~37k census tracts: fit a log-normal whose mean comes from ADRH equivalised income and whose σ comes from the tract Gini via `σ = √2 · Φ⁻¹((G + 1) / 2)`.
2. ~5.5% of tracts are missing Gini; impute with an XGBoost on `(log income_equiv, dependency ratio, mean age, % single-person households, household size, population, province FE)`.
3. Population-weight the per-tract log-normals into a national / per-province / per-municipality mixture. Evaluate density on a 1,000-point grid up to €160k. Solve numerically for the 1st–99th percentiles at each level.
4. Outputs are written as FST and converted to Arrow by [scripts/convert-data.R](scripts/convert-data.R).

For the published methodology note, see the validation repo's `tex/note.pdf`.

### Files in [public/data/](public/data/)

| File | Contents | Loader in code |
|------|----------|----------------|
| `national_percentiles.arrow` | 99 numbers — value at percentile 1..99 nationally | [`loadNationalPercentiles`](src/lib/dataLoader.ts) |
| `provincial_percentiles.arrow` | One column per province code; rows are percentile 1..99 | [`loadProvincialPercentiles`](src/lib/dataLoader.ts) |
| `mun_percentiles.arrow` | One column per ~8k municipality codes; rows are percentile 1..99 | [`loadMunicipalPercentiles`](src/lib/dataLoader.ts) |
| `municipality_lookup.arrow` | `{ mun_code, mun_name, prov_code, prov_name }` | [`loadMunicipalityLookup`](src/lib/dataLoader.ts) |
| `density_curve.arrow` | National density `{ x, y }` points | [`loadNationalDensity`](src/lib/dataLoader.ts) |
| `density_curve_prov.arrow` | All provincial density curves stacked: `{ prov_code, x, y }` | [`loadProvincialDensity`](src/lib/dataLoader.ts) |
| `density_curve_mun/mun_<provCode>.arrow` | Municipal density curves for one province (one file per province ~ 54 files) | [`loadMunicipalDensity`](src/lib/dataLoader.ts) |
| `municipality_stats.arrow` | Per-municipality `{ net_income_equiv, pct_higher_ed_completed, pct_foreign_born, *_is_imputed }` | [`loadMunicipalityStats`](src/lib/dataLoader.ts) |

### Updating the data

When the validation repo produces new outputs:

```bash
# from the validation repo
Rscript code/predict_gini_ml.r
Rscript code/prep_lognormal.r
Rscript code/mun_stats.r

# copy fresh data/ into this repo's data/, then from this repo:
Rscript scripts/convert-data.R     # writes public/data/*.arrow
npm run build
```

`scripts/convert-data.R` writes uncompressed Feather v2 — required because the browser-side `apache-arrow` IPC reader does not handle LZ4/ZSTD frames.

---

## App architecture

```
src/
├── app/
│   ├── page.tsx              # 4-state machine: landing → questions → loading → results
│   ├── layout.tsx            # Metadata, font + CSS imports
│   ├── globals.css           # Re-exports public/css/*
│   └── api/appendResponse/
│       └── route.ts          # Server-side Google Sheets append (POST)
├── components/
│   ├── LandingPage.tsx       # Animated hero + start button
│   ├── QuestionFlow.tsx      # Orchestrates the 4-step questionnaire
│   ├── questions/            # One file per step (municipality / income / household / perceived)
│   ├── ResultsView.tsx       # National/Provincial/Municipal toggle + chart + stats
│   ├── DistributionChart.tsx # HighchartsReact wrapper
│   ├── StatsCards.tsx        # Three small-box demographic cards
│   ├── HelpModal.tsx         # FAQ modal with 6 lazy-loaded tabs
│   ├── CookieBanner.tsx      # Top-of-page consent banner
│   └── ErrorBoundary.tsx     # Class boundary used around chart + stats
├── hooks/
│   └── useQuestionFlow.ts    # Form state + step navigation
├── lib/
│   ├── analytics.ts          # GA4 init + cookieConsent helpers
│   ├── calculations.ts       # equiv income, percentile lookup, formatters
│   ├── dataLoader.ts         # Arrow IPC loaders + in-memory cache
│   ├── DataContext.tsx       # React context: shared municipality_lookup
│   ├── sheetLogger.ts        # Fire-and-forget POST to /api/appendResponse
│   ├── validation.ts         # Per-step validation predicates
│   └── charts/
│       ├── theme.ts          # Chart palette / fonts / motion (mirrors CSS tokens)
│       ├── formatters.ts     # Euro / k€ formatters used by Highcharts
│       └── distributionOptions.ts  # buildDistributionOptions() — all chart config
└── types/
    └── index.ts              # UserInput, CalculatedResults, ViewType, etc.
```

### Page state machine

[src/app/page.tsx](src/app/page.tsx) holds four mutually-exclusive booleans:

```
showLanding (true on mount)
   │  user clicks "Comenzar"
   ▼
showQuestions
   │  user clicks "Calcular" — handleCalculate awaits the calculation Promise
   ▼
isLoading                           ← spinner stage
   │  Promise resolves
   ▼
showResults
```

`handleRecalculate()` returns to `showQuestions` and clears `userInput`/`results`. Every screen except landing renders the help button (top-right, fixed).

### Data flow

1. **On mount of `<QuestionFlow>`**: `municipality_lookup` is fetched once via `useMunicipalityLookup()` (DataContext). All four downstream consumers (`QuestionFlow`, `ResultsView`, `StatsCards`, `DistributionChart`) read from the same context — no duplicate fetches.
2. **On submit**: `QuestionFlow` builds a `UserInput` containing a `calculationPromise`. The promise loads the three percentile tables in parallel, computes the percentile rank at each level, and (if consent given) posts to `/api/appendResponse`.
3. **In `<ResultsView>`**: `viewType` toggles drive `<DistributionChart>` to load the relevant density (`density_curve` / `density_curve_prov` / `density_curve_mun/mun_<prov>`) and re-render.

---

## Calculation logic (read this before changing percentile math)

All math lives in [src/lib/calculations.ts](src/lib/calculations.ts) and must stay byte-identical to the validation repo's expectations.

- **Equivalence scale (modified OECD):** `scale = 1 + max(0, adults - 1) · 0.5 + children · 0.3`. `equiv_income = (monthlyIncome · 12) / scale`.
- **Pagas (annualisation):** Spanish payroll splits the annual amount across 12 or 14 monthly payments. If the user picks `14 pagas`, the entered "monthly" figure is one of those 14 — so the displayed annual is `monthlyIncome · 14`. We multiply by `14/12` before applying the equivalence scale, so the equivalence math stays in the same 12-month frame.
- **Percentile lookup:** `findPercentile(value, percentiles[])` returns the largest 1-based index `p` such that `percentiles[p-1] ≤ value`. Clamped to `[1, 100]`. The percentiles array is sorted ascending and is exactly 99 entries (1..99).
- **Inverse lookup:** `findValueForPercentile(p, percentiles[])` is used by the chart to position the user's perceived-percentile guess on the x-axis.

---

## Conventions

- **CSS tokens live in [public/css/styles.css](public/css/styles.css)** under `:root`. TypeScript code that needs the same values (chart palette, motion durations) must read them from `src/lib/charts/theme.ts`, which mirrors the CSS variables. If you change a token in CSS, update `theme.ts`.
- **No CSS-in-JS or Tailwind.** Components use plain class names from the four `public/css/*.css` files. New styles go in `styles.css` (general) or `styles_results.css` (results screen only) — not in component `style={...}` props.
- **Spanish UI strings.** All user-facing text is `es-ES`. Currency formatting uses `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`.
- **Apache Arrow loading is synchronous-after-fetch.** `tableFromIPC()` is fast but blocks the main thread — keep arrow files small (<5 MB each). The largest is `density_curve_mun/mun_*.arrow` at ~1–2 MB per province.

---

## Dev commands

```bash
npm run dev      # Next.js dev server on :3000
npm run build    # production build (must pass with zero TS errors)
npm run start    # serve production build
npm run lint     # next lint
```

### Required environment variables

Set in `.env.local` for local dev, in Vercel for production:

```
GOOGLE_SHEETS_CLIENT_EMAIL    # service account email
GOOGLE_SHEETS_PRIVATE_KEY     # service account private key (literal \n in file is OK; route.ts unescapes)
GOOGLE_SHEET_ID               # target spreadsheet id
NEXT_PUBLIC_GA_MEASUREMENT_ID # GA4 id (loaded only on cookie accept)
NEXT_PUBLIC_SITE_URL          # canonical URL — used for OG image absolute paths
```

If sheets credentials are missing, the POST returns 500 but the user-facing flow is unaffected (the call is fire-and-forget client-side).

---

## What NOT to change without thinking

- **Equivalence scale and percentile lookup logic** — must match the validation repo's published methodology. Any change to [src/lib/calculations.ts](src/lib/calculations.ts) needs to round-trip through the methodology note.
- **Arrow column names** — they are the schema contract with `convert-data.R`. Renaming `mun_code` → `municipality_id` here would silently break the next data refresh.
- **`'unsafe-inline'` in the CSP** ([next.config.js](next.config.js)) — required because Highcharts injects inline `<style>` for every chart redraw. Removing it breaks the chart.
- **Cookie banner default = no consent.** GA only loads after explicit accept. Don't pre-load `gtag.js`.
