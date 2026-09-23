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

The frontend ships pre-computed Apache Arrow files in [public/data/](public/data/). Those files are produced by the R pipeline in [methodology/](methodology/) (scripts run from that folder; `methodology/run_pipeline.sh` runs the whole chain):

```
methodology/code/   (R pipeline)
        │
        ├── 0d. ecv_nowcast.r           # national nowcast factor, ADRH year → current year (ECV)
        ├── 1. predict_gini_ml.r        # XGBoost imputes missing tract-level Gini
        ├── 2. prep_lognormal.r         # log-normal mixture per tract → percentiles + density (nowcast)
        ├── 3a. mun_stats.r             # municipality demographics (income, edu, foreign-born), base year
        ├── 3c. apply_nowcast_mun_stats.r  # nowcasts the municipal income stat
        └── 3b. tract_stats.r           # tract-level outputs (NOT consumed by this app)
        │
        └── methodology/data/*.fst      # FST output (gitignored, regenerated)
                │
                └── scripts/convert-data.R
                        │
                        └── public/data/*.arrow         # Feather v2, no compression
```

### Sources

- **ADRH** (INE *Atlas de Distribución de Renta de los Hogares*, 2023) — net household and equivalised income, Gini, at census-tract / municipal / provincial level. Loaded via the `ineAtlas` R package.
- **ECV** (INE *Encuesta de Condiciones de Vida*, table 9947) — national mean equivalised income, used only for the nowcast.
- **Census 2021** (INE) — demographics (population, age, household composition, employment, education, foreign-born share). Loaded via `ineAtlas::get_census()`.
- **INE tract tables** (CSV exports, population by place of birth and by educational attainment) — education + foreign-born share for `3a. mun_stats.r`; the folder is passed as `TRACT_TABLES_DIR`. `3a` writes the base-year file `methodology/data-raw/municipality_stats_2023.fst`, which is kept in git so the rest of the pipeline runs without those CSVs.

### Method (in 30 seconds)

1. For each of ~37k census tracts: fit a log-normal whose mean comes from ADRH equivalised income and whose σ comes from the tract Gini via `σ = √2 · Φ⁻¹((G + 1) / 2)`.
2. ~5.5% of tracts are missing Gini; impute with an XGBoost on `(log income_equiv, dependency ratio, mean age, % single-person households, household size, population, province FE)`.
3. Population-weight the per-tract log-normals into a national / per-province / per-municipality mixture. Evaluate density on a 1,000-point grid up to €160k. Solve numerically for the 1st–99th percentiles at each level.
4. **Nowcast to 2024:** ρ = Σ ADRH national growth / Σ ECV national growth over the years both cover (2016–2023); 2024 growth = ρ × ECV growth (currently 0.935 × 5.44% = 5.09%). Every tract's income is scaled by that one factor (shifts μ, leaves σ), and the municipal income stat likewise.
5. Outputs are written as FST and converted to Arrow by [scripts/convert-data.R](scripts/convert-data.R). The municipality lookup only contains municipalities with an estimated distribution (ADRH suppresses income for a few dozen tiny ones), so every selectable municipality has percentiles.

For the published methodology note, see [methodology/tex/note.pdf](methodology/tex/note.pdf) (rebuild with `bash methodology/tex/build_note.sh`).

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

```bash
bash methodology/run_pipeline.sh   # 0d → 2 → 3c, then scripts/convert-data.R → public/data/*.arrow
# RUN_GINI_MODEL=1 also re-fits 1. predict_gini_ml.r
# TRACT_TABLES_DIR=/path also rebuilds the base year with 3a. mun_stats.r
npm test && npm run build
```

When the ADRH or ECV publish a new year, bump `BASE_INCOME_YEAR` / `TARGET_INCOME_YEAR` in `0d`, the `year == 2023` filters in `1`, `2` and `3a`, the reference year in the UI copy, and the nowcast paragraph of the note.

`scripts/convert-data.R` writes uncompressed Feather v2 — required because the browser-side `apache-arrow` IPC reader does not handle LZ4/ZSTD frames.

---

## App architecture

```
src/
├── app/
│   ├── page.tsx              # Renders <App /> (the whole site is one client state machine)
│   ├── layout.tsx            # Metadata, next/font (Fraunces + Hanken Grotesk), CSS links
│   ├── globals.css           # Minimal reset only — real styles live in public/css/
│   ├── mocks/                # Dev/preview-only screen gallery (see "Mocks" below)
│   └── api/appendResponse/
│       └── route.ts          # Server-side Google Sheets append (POST)
├── components/
│   ├── App.tsx               # 4-stage machine: landing → questions → loading → results; bootable at any stage
│   ├── LandingPage.tsx       # Animated hero + start button
│   ├── QuestionFlow.tsx      # Orchestrates the 4-step questionnaire
│   ├── questions/            # One file per step (municipality / income / household / perceived)
│   ├── ResultsView.tsx       # National/Provincial/Municipal toggle + chart + stats
│   ├── DistributionChart.tsx # HighchartsReact wrapper
│   ├── StatsCards.tsx        # Three small-box demographic cards
│   ├── HelpModal.tsx         # FAQ modal with 6 lazy-loaded tabs
│   ├── CookieBanner.tsx      # Top-of-page consent banner
│   ├── ErrorBoundary.tsx     # Class boundary used around chart + stats
│   └── mocks/                # MockScreen (control bar) + scenarios.ts (one entry per mock)
├── hooks/
│   └── useQuestionFlow.ts    # Form state + step navigation
├── lib/
│   ├── analytics.ts          # GA4 init + cookieConsent helpers
│   ├── calculations.ts       # equiv income, percentile lookup, formatters
│   ├── computeResults.ts     # answers → percentiles at 3 levels (questionnaire + mocks)
│   ├── dataLoader.ts         # Arrow IPC loaders + in-memory cache
│   ├── DataContext.tsx       # React context: shared municipality_lookup
│   ├── sheetLogger.ts        # Fire-and-forget POST to /api/appendResponse
│   ├── validation.ts         # Per-step validation predicates
│   ├── viewTransition.ts     # runViewTransition(): screen/step changes via startViewTransition
│   └── charts/
│       ├── theme.ts          # Chart palette / fonts / motion (mirrors CSS tokens)
│       ├── formatters.ts     # Euro / k€ formatters used by Highcharts
│       └── distributionOptions.ts  # buildDistributionOptions() — all chart config
└── types/
    └── index.ts              # UserInput, CalculatedResults, ViewType, etc.
```

### Page state machine

[src/components/App.tsx](src/components/App.tsx) holds one `stage`:

```
'landing' (on mount)
   │  user clicks "Comenzar"
   ▼
'questions'
   │  user clicks "Calcular" — handleCalculate awaits the calculation Promise
   ▼
'loading'                           ← spinner stage, held for at least MIN_LOADING_MS (800 ms)
   │  Promise resolves
   ▼
'results'
```

`handleRecalculate()` returns to `'questions'` and clears `userInput`/`results`. Every screen except landing renders the help button (bottom-right, fixed). Stage changes and question steps run through `runViewTransition()` ([src/lib/viewTransition.ts](src/lib/viewTransition.ts)): where `document.startViewTransition` exists the old frame fades out with a soft focus while the new one plays its own CSS entrance; elsewhere (and in jsdom) the update is immediate. `App` takes an optional `boot` (start stage, pre-filled answers, results, help tab…) and a `mock` flag (no analytics, no sheet logging, no stored consent) — that is what the mocks use.

### Mocks

`/mocks/` lists every screen; `/mocks/<id>/` boots the real `App` straight into that state (21 scenarios in [src/components/mocks/scenarios.ts](src/components/mocks/scenarios.ts): landing, each questionnaire step and its validation states, loading, results at the three levels and at the extremes, help modal). Results mocks compute their numbers from the real Arrow data through `computeResults()`. On each mock: ← / → switch screens, R replays the entrance, H hides the control bar; append `?clean` to drop the bar entirely (screenshots). The route is `noindex` and 404s when built with `VERCEL_ENV=production`, so it exists locally and on Vercel preview deployments only. Add a scenario there when you add a screen or state.

### Prototypes

`src/prototypes/ensayo/` is the redesign chosen to replace the main app: an academic explorable essay (a matte take on the current look, with scrollytelling from 100 squares to the income curve). It is not routed on the public site while it is being integrated. It uses `src/prototypes/shared/`, which provides `useFlow` (answers and the real `computeResults`), `useLevels` (the three levels, curves, landmarks and stats), the `MunicipalitySearch` combobox, the Spanish sentences in `format.ts` and SVG geometry in `chart.ts`. Read `src/prototypes/README.md` before touching them. The other directions that were compared (Portada, Formulario, Cien, Línea) are in the git history.

### Data flow

1. **On mount of `<QuestionFlow>`**: `municipality_lookup` is fetched once via `useMunicipalityLookup()` (DataContext). All four downstream consumers (`QuestionFlow`, `ResultsView`, `StatsCards`, `DistributionChart`) read from the same context — no duplicate fetches.
2. **On submit**: `QuestionFlow` builds a `UserInput` containing a `calculationPromise`. The promise loads the three percentile tables in parallel, computes the percentile rank at each level, and (if consent given) posts to `/api/appendResponse`.
3. **In `<ResultsView>`**: `viewType` toggles drive `<DistributionChart>` to load the relevant density (`density_curve` / `density_curve_prov` / `density_curve_mun/mun_<prov>`) and re-render.

---

## Calculation logic (read this before changing percentile math)

All math lives in [src/lib/calculations.ts](src/lib/calculations.ts) and must stay byte-identical to the methodology in [methodology/](methodology/) (the note and the R pipeline).

- **Equivalence scale (modified OECD):** `scale = 1 + max(0, adults - 1) · 0.5 + children · 0.3`. `equiv_income = (monthlyIncome · 12) / scale`.
- **Pagas (annualisation):** Spanish payroll splits the annual amount across 12 or 14 monthly payments. If the user picks `14 pagas`, the entered "monthly" figure is one of those 14 — so the displayed annual is `monthlyIncome · 14`. We multiply by `14/12` before applying the equivalence scale, so the equivalence math stays in the same 12-month frame.
- **Percentile lookup:** `findPercentile(value, percentiles[])` returns the largest 1-based index `p` such that `percentiles[p-1] ≤ value`. Clamped to `[1, 100]`. The percentiles array is sorted ascending and is exactly 99 entries (1..99).
- **Inverse lookup:** `findValueForPercentile(p, percentiles[])` is used by the chart to position the user's perceived-percentile guess on the x-axis.

---

## Conventions

- **CSS tokens live in [public/css/styles.css](public/css/styles.css)** under `:root`. TypeScript code that needs the same values (chart palette, motion durations) must read them from `src/lib/charts/theme.ts`, which mirrors the CSS variables. If you change a token in CSS, update `theme.ts` — [tests/designContract.test.ts](tests/designContract.test.ts) fails when they drift.
- **Typography.** Two families, self-hosted via `next/font/google` in [layout.tsx](src/app/layout.tsx): **Fraunces** (variable serif, `opsz`/`SOFT`/`WONK` axes) for display — landing headline, question titles, the percentile hero, stat values, modal headings — and **Hanken Grotesk** for UI/body. They arrive on `<html>` as `--font-fraunces` / `--font-hanken`; always reference them through `var(--font-display)` / `var(--font-ui)` (defined in `styles.css`), never by family name. Highcharts gets the resolved family via `resolveChartFont()` in `theme.ts`. Don't reintroduce Inter (the contract test checks).
- **Buttons.** One system: `.btn` + variant (`.btn--primary` | `.btn--secondary` | `.btn--ghost`) + optional size (`.btn--sm` | `.btn--xl`), icons via `.btn__icon` (`--left` / `--right` / `--chip`). The results view toggle is `.seg` / `.seg__btn.is-active`. Every `<button>` declares `type=`. Don't add per-component button classes.
- **Layout is centered.** Question cards, the results hero, stats row and action rows are centered stacks; keep new UI on that axis.
- **No CSS-in-JS or Tailwind.** Components use plain class names from the four `public/css/*.css` files (see the file map at the top of `styles.css`). New styles go in `styles.css` (general), `custom-components.css` (widgets), `styles_results.css` (results screen) or `help-modal.css` — not in component `style={...}` props. A class used in JSX must exist in one of those files (the contract test enumerates every `className`).
- **Spanish UI strings.** All user-facing text is `es-ES`. Currency formatting uses `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`.
- **Apache Arrow loading is synchronous-after-fetch.** `tableFromIPC()` is fast but blocks the main thread — keep arrow files small (<5 MB each). The largest is `density_curve_mun/mun_*.arrow` at ~1–2 MB per province.

---

## Dev commands

```bash
npm run dev      # Next.js dev server on :3000
npm run build    # production build (must pass with zero TS errors)
npm run start    # serve production build
npm run lint     # next lint
npm test         # vitest (jsdom) — run before every commit
```

### Tests

[tests/](tests/) is a Vitest + Testing Library suite. Fixtures live in [tests/helpers/mockData.ts](tests/helpers/mockData.ts). Coverage, by layer:

- **Pure logic** — `calculations`, `validation`, `chartFormatters`, `chartOptions`, `sheetLogger`, `useCountUp`, `useQuestionFlow`, `viewTransition`, `mockScenarios`.
- **Components** — one file per screen/step (`LandingPage`, `ProgressHeader`, `MunicipalityStep`, `IncomeStep`, `HouseholdStep`, `PerceivedStep`, `ResultsView`, `StatsCards`, `HelpModal`, `CookieBanner`, `ErrorBoundary`). Highcharts is stubbed (it cannot render in jsdom); `dataLoader` is mocked.
- **Flows** — `QuestionFlow.test.tsx` walks all four steps with mocked Arrow data and asserts the resolved percentiles; `page.test.tsx` covers the landing → questions → loading → results/error state machine and booting `App` at a given stage.
- **Contract** — `designContract.test.ts` reads the source tree: every JSX class exists in CSS, `theme.ts` mirrors `:root`, no Inter, every `<button>` has a `type`.

`npm run build` needs network access the first time (next/font downloads Fraunces + Hanken Grotesk at build time; Vercel has it).

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

- **Equivalence scale and percentile lookup logic** — must match the published methodology ([methodology/tex/note.pdf](methodology/tex/note.pdf)). Any change to [src/lib/calculations.ts](src/lib/calculations.ts) needs to round-trip through the methodology note.
- **Arrow column names** — they are the schema contract with `convert-data.R`. Renaming `mun_code` → `municipality_id` here would silently break the next data refresh.
- **`'unsafe-inline'` in the CSP** ([next.config.js](next.config.js)) — required because Highcharts injects inline `<style>` for every chart redraw. Removing it breaks the chart.
- **Cookie banner default = no consent.** GA only loads after explicit accept. Don't pre-load `gtag.js`.
