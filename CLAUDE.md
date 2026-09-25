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
methodology/code/   (R pipeline, run from methodology/ by run_pipeline.sh)
        │
        ├── 0d. ecv_nowcast.r           # national nowcast factor, ADRH year → target year (ECV); sets BASE/TARGET years
        ├── 1. predict_gini_ml.r        # XGBoost imputes the Gini of tracts without one (optional re-fit)
        ├── 1b. fit_gb2.r               # GB2 per tract, fitted to the 13 published ADRH indicators (gb2_engine.r)
        ├── 1c. gb2_holdout.r           # leave-one-share-out validation (optional, RUN_HOLDOUT=1)
        ├── 2. prep_distributions.r     # GB2 / log-normal mixtures → percentiles + densities (nowcast)
        ├── 3a. mun_stats.r             # municipality stats (income, edu, foreign-born), base year
        ├── 3c. apply_nowcast_mun_stats.r  # nowcasts the municipal income stat
        ├── 5. note_figures.r / 6. note_numbers.r  # the note's figures, tables and numbers.tex
        └── 3b. tract_stats.r           # tract-level outputs (NOT consumed by this app)
        │
        └── methodology/data/*.fst      # FST output (gitignored, regenerated)
                │
                └── scripts/convert-data.R
                        │
                        └── public/data/*.arrow         # Feather v2, no compression
```

### Sources

- **ADRH** (INE *Atlas de Distribución de Renta de los Hogares*, 2023) — per tract and municipality: mean and median income per consumption unit, Gini, P80/P20 and the shares of population below/above nine thresholds. Loaded via the `ineAtlas` R package; the national and provincial totals used to validate come from INE tables 53689/53688/53690/53694 via `ineapir`.
- **ECV** (INE *Encuesta de Condiciones de Vida*, table 9947) — national mean equivalised income, used only for the nowcast.
- **ADRH demographics** (population, age, household composition) per tract, via `ineAtlas`, for the weights and the Gini model.
- **INE tract tables** (CSV exports, population by place of birth and by educational attainment) — education + foreign-born share for `3a. mun_stats.r`; the folder is passed as `TRACT_TABLES_DIR`. `3a` writes the base-year file `methodology/data-raw/municipality_stats_2023.fst`, which is kept in git so the rest of the pipeline runs without those CSVs.

### Method (in 30 seconds)

1. **Each census tract is a GB2** (generalised beta of the second kind), `F(y) = I_t(p, q)` with `t = (y/b)^a / (1 + (y/b)^a)`, fitted by weighted minimum distance to the 13 indicators the ADRH publishes for it: median, mean, Gini (computed as the ADRH does, after replacing the lowest and highest 1.5% of values), P80/P20 and 9 threshold shares. Published medians are €700-interval midpoints and are treated as intervals; values at the ADRH's caps are soft-censored. The 3,396 tracts without published shares get share targets from a regression on their core indicators, shifted to reproduce their municipality's published shares. Engine: `code/gb2_engine.r` (about 11 s on 10 cores). The comparison with other methods that led to GB2 is kept locally in `methodology/method_comparison.md` and `methodology/research/` (gitignored, not published).
2. **Tracts without income indicators** (1,370, 0.3% of the population, nearly all under 100 residents) get a log-normal: σ from a Gini imputed with XGBoost (log income, dependency ratio, mean age, share under 18, single-person households, household size, population, province dummies; CV RMSE 2.57), location from the imputed mean.
3. **Mixtures:** national, provincial and municipal distributions are population-weighted mixtures of the tract distributions; the 1st–99th percentiles are solved with Brent's method, and densities are closed-form on a grid up to €160k.
4. **Nowcast to 2024:** ρ = Σ ADRH national growth / Σ ECV national growth over the years both cover (2016–2023); 2024 growth = ρ × ECV growth (currently 0.935 × 5.44% = 5.09%, with a range of about 4.6–5.4% depending on the window). Every income is scaled by that factor (GB2 `b → k·b`, log-normal `μ → μ + ln k`), and the municipal income stat likewise. The app asks users for their 2024 income.
5. Outputs are written as FST and converted to Arrow by [scripts/convert-data.R](scripts/convert-data.R). The municipality lookup only contains municipalities with an estimated distribution (81 ADRH municipalities without income data are excluded). `net_income_equiv_is_imputed = 1` exactly where the ADRH publishes no income per consumption unit (1,324 municipalities in the lookup, shown as "(2024, estimada)"); 1,326 municipalities are built only from fallback tracts.

For the published methodology note, see [methodology/tex/note.pdf](methodology/tex/note.pdf). Every number in it comes from `methodology/tex/numbers.tex`, written by `6. note_numbers.r`, and its tables and figures from `5.`/`6.`, so the note updates itself when the data change; rebuild with `BUILD_NOTE=1` or `bash methodology/tex/build_note.sh`.

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
bash methodology/run_pipeline.sh   # 0d → 1b → 2 → 3a → 3c → convert-data.R → 5 → 6
# RUN_GINI_MODEL=1   also re-fits 1. predict_gini_ml.r
# RUN_HOLDOUT=1      also re-runs the GB2 hold-out (1c)
# TRACT_TABLES_DIR=/path  also rebuilds the census columns of the base-year municipal stats
# BUILD_NOTE=1       also rebuilds methodology/tex/note.pdf
npm test && npm run build
```

When the ADRH or ECV publish a new year, bump `BASE_INCOME_YEAR` / `TARGET_INCOME_YEAR` in `0d` (the other scripts read the years from its output), the census periods in `3a` if the CSVs are refreshed, and the year in the app's copy (the income question asks for the target year). The note's numbers, tables and figures regenerate themselves.

`scripts/convert-data.R` writes uncompressed Feather v2 — required because the browser-side `apache-arrow` IPC reader does not handle LZ4/ZSTD frames.

---

## App architecture

The site is one page: an explorable essay ("Ensayo"). An opening, four questions, then a scrollytelling figure in which a hundred squares (Spain as 100 people) become the income distribution, then a summary at the three levels. Help (data, method, FAQ) is the HelpModal.

```
src/
├── app/
│   ├── page.tsx              # Renders <EnsayoApp /> (the whole site is one client component)
│   ├── layout.tsx            # Metadata, next/font (Fraunces + Hanken Grotesk), global CSS links
│   ├── globals.css           # Minimal reset only
│   └── api/appendResponse/
│       └── route.ts          # Server-side Google Sheets append (POST)
├── components/
│   ├── ensayo/               # The essay (CSS modules)
│   │   ├── App.tsx           # Entry: DataProvider, cookie banner, help dialog, analytics; the essay itself
│   │   ├── HeroField.tsx     # The opening animation (canvas): crowd → piles by income → curve → "¿Tú?"
│   │   ├── Questions.tsx     # The four questions, one at a time (+ GuessPicker.tsx: the 10×10 guess grid)
│   │   ├── MunicipalitySearch.tsx  # Accessible headless combobox over the municipalities
│   │   ├── Story.tsx         # Act II: sticky figure + nine scroll steps (IntersectionObserver)
│   │   ├── Figure.tsx        # The figure: 100 squares ↔ histogram ↔ curve, per step
│   │   ├── Summary.tsx       # Three levels as small multiples, municipality facts, share / restart
│   │   ├── Sidenote.tsx      # Margin notes (inline, tappable, on narrow screens)
│   │   ├── geometry.ts       # Squares → bins, curve scaled to the squares, label placement
│   │   ├── copy.ts           # The essay's sentences
│   │   └── hooks.ts          # Media queries / reduced motion, element size, tweened curves, counters
│   ├── HelpModal.tsx         # FAQ dialog with 6 tabs (+ HelpModal/*Tab.tsx); openHelp(tab?) opens it, no button of its own
│   ├── CookieBanner.tsx      # Top-of-page consent banner
│   └── ErrorBoundary.tsx     # Class boundary around the results
├── hooks/
│   ├── useFlow.ts            # Answers, validation, the calculation, the research log
│   └── useLevels.ts          # The three levels' percentiles, density curves, medians, municipality stats
├── lib/
│   ├── analytics.ts          # GA4 init + cookieConsent helpers
│   ├── calculations.ts       # equiv income, percentile lookup
│   ├── computeResults.ts     # answers → percentiles at 3 levels
│   ├── dataLoader.ts         # Arrow IPC loaders + in-memory cache
│   ├── DataContext.tsx       # React context: shared municipality_lookup
│   ├── format.ts             # Spanish numbers and the shared sentences (headline, outOf100, perceptionGap…)
│   ├── chartGeometry.ts      # resample a density, smooth SVG paths, ticks
│   ├── municipalitySearch.ts # Ranking for the municipality combobox
│   ├── share.ts              # Web Share, falling back to the clipboard
│   ├── sheetLogger.ts        # Fire-and-forget POST to /api/appendResponse
│   └── validation.ts         # Income validation, text normalisation
└── types/
    └── index.ts              # CalculatedResults, Municipality, MunicipalityStats, etc.
```

### The essay

- **Opening.** A full-screen title ("Descubre tu posición en la distribución de la renta", rising word by word) and the earlier site's subtitle over `HeroField.tsx`: a canvas where ~2.800 dots (fewer on phones) gather as a crowd, flow into piles by income using the real national percentiles, get the density curve drawn over them, and a blue "¿Tú?" walks along the curve. A scroll cue follows: the essay starts when you scroll. The canvas draws nothing without IntersectionObserver (tests) and only the last frame with reduced motion.
- **Questions** (`Questions.tsx`): municipality, monthly net household income **in 2024** (the year the distributions are nowcast to) with 12/14 pagas, household (people aged 14+ and under 14), and the guess: "how many of 100 people have less income than you", picked on a 10×10 grid or a slider (1–99, no default). `useFlow().calculate()` runs `computeResults` with a minimum loading beat.
- **Squares.** A result p means p % of people are below you, so p squares are dark, yours (blue) is square p+1 in reading order, and 99−p are light. The guess g works the same way: the dashed ochre square is g+1. Never number the user's square in copy; talk about people below.
- **Story** (`Story.tsx` + `Figure.tsx`): one sticky figure, nine steps. Grid → sorted → guess → you → histogram (each square at its percentile's income, 5.000 € bins to 90.000 €) → national curve scaled to the squares' area → guess and income lines ("Tu predicción", "Tu hogar") → province (no median line there) → municipality, whose median is named by place ("Mediana de Aranjuez: …"). From the lines step on, every chart (the story's and the summary's three) shows both "Tu predicción" and "Tu hogar". A "Saltar al resumen" link sits under the story's heading. Without IntersectionObserver (tests) the figure shows the final state; with reduced motion, squares cross-fade instead of moving.
- **Help.** The HelpModal is the site's help (data, income, household scale, method, chart, author). It has no button of its own: `openHelp(tab?)` opens it from the header ("Ayuda y metodología"), the household question (`'hogar'`) and the closing line (`'metodologia'`). Its text is unchanged from the previous design; `public/css/help-modal.css` styles it like the essay. The cookie banner and the dialog render outside the essay's root.
- **Research log.** `useFlow({ logResponses: true })` posts `{ timestamp, municipality, monthly_income, adults, children, perceived_percentile, actual_percentile, equiv_income }` after each calculation; `logResponseToSheet` only sends it if the visitor accepted cookies.

### Data flow

1. **On mount**: `municipality_lookup` is fetched once through `DataContext` (`useMunicipalities()`), shared by the combobox and `useFlow`.
2. **On calculate**: `computeResults` loads the three percentile tables in parallel and computes the percentile rank at each level; with consent, the answers are posted to `/api/appendResponse`.
3. **For the figures**: `useLevels` loads the national, provincial (`density_curve_prov`) and municipal (`density_curve_mun/mun_<prov>`) densities and the municipality stats.

### Icons and promo

- **Icons** use Next's file conventions in `src/app/`: `icon.svg` (the curve with the blue "¿Tú?" dot), `apple-icon.png` (180×180, full bleed) and `favicon.ico` (48×48). The social card is `public/card_media.png`.
- **`promo/`** is a separate package (not part of the app build) that renders the 15-second promo video: `src/scene.html` is a pure function of time (`window.render(t)`), `src/render.mjs` screenshots it frame by frame with headless Chrome into ffmpeg, and `src/music.mjs` synthesises the original score on the same 120 BPM grid. `cd promo && npm i && npm run preview` (stills in `promo/frames/`) or `npm run render` (`promo/videos/*.mp4`, gitignored).

---

## Calculation logic (read this before changing percentile math)

All math lives in [src/lib/calculations.ts](src/lib/calculations.ts) and must stay byte-identical to the methodology in [methodology/](methodology/) (the note and the R pipeline).

- **Equivalence scale (modified OECD):** `scale = 1 + max(0, adults - 1) · 0.5 + children · 0.3`. `equiv_income = (monthlyIncome · 12) / scale`.
- **Pagas (annualisation):** Spanish payroll splits the annual amount across 12 or 14 monthly payments. If the user picks `14 pagas`, the entered "monthly" figure is one of those 14 — so the displayed annual is `monthlyIncome · 14`. We multiply by `14/12` before applying the equivalence scale, so the equivalence math stays in the same 12-month frame.
- **Percentile lookup:** `findPercentile(value, percentiles[])` returns the largest 1-based index `p` such that `percentiles[p-1] ≤ value`: the whole-number share of people with a lower income. It returns 0 below P1 and 100 at or above P99. The percentiles array is sorted ascending and is exactly 99 entries (1..99). The UI shows the number capped to 1–99 (`displayPercentile`), but wording is decided on the raw value: 0 reads "entre el 1 % con menos ingresos", 1 reads "más que el 1 %" (`headline`, `outOf100`, `countBelow`).
- **Inverse lookup:** `findValueForPercentile(p, percentiles[])` is used by the chart to position the user's perceived-percentile guess on the x-axis.

---

## Conventions

- **Styles.** The essay uses **CSS modules** next to its components (`import s from './X.module.css'`, `className={s.foo}`); its palette and type scale are custom properties on its root in `App.module.css` (paper #FAF9F6, ink, blue #2458C6 for "you", ochre #A5600C for the guess). Inline `style` only for data-driven values (positions, transforms, sizes). The four global stylesheets in `public/css/` still load; they now serve the HelpModal, the cookie banner and the error fallback, whose plain class names must exist there (the contract test checks). The global `input[type='text'] { font-size: 16px }` rule inside a max-width 768px query beats a single module class, so give inputs selectors of at least two classes.
- **Typography.** Two families, self-hosted via `next/font/google` in [layout.tsx](src/app/layout.tsx): **Fraunces** (variable serif, `opsz`/`SOFT`/`WONK` axes) for the title, headings, body text and big numbers, and **Hanken Grotesk** for UI, figure labels and captions. They arrive on `<html>` as `--font-fraunces` / `--font-hanken`. Don't reintroduce Inter (the contract test checks).
- **Look.** Matte and academic: hairline rules instead of cards, radii of 2–4px at most, no glass, gradients, glows or shadows. Figures are numbered with captions; asides go in sidenotes.
- **Wording.** The distributions are population-weighted, with each household's income per consumption unit, so describe people: "más que el 86 % de la población", "86 de cada 100 personas tienen menos ingresos que tú", "la persona con menos ingresos". Don't talk about households when describing the row of people. The essay doesn't explain consumption units or say what it compares with (that is in the help dialog). Avoid semicolons in copy. The shared sentences live in `src/lib/format.ts`.
- **Buttons.** Every `<button>` declares `type=`. The HelpModal and cookie banner use the global `.btn` system.
- **Spanish UI strings.** All user-facing text is `es-ES`. Numbers go through `src/lib/format.ts` (`euro()`, `pct()`, `num()`), which groups four-digit numbers too ("5.143 €").
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

- **Pure logic** — `calculations`, `validation`, `municipalitySearch`, `sheetLogger`; `ensayoShared` (formatting, the shared sentences, chart geometry, the combobox).
- **Components** — `HelpModal`, `CookieBanner`, `ErrorBoundary`.
- **The essay** — `Ensayo.test.tsx` walks the four questions with mocked Arrow data, checks the research log payload, the story (jsdom has no IntersectionObserver, so the figure is in its final state: p dark squares, yours, 99−p light), the summary, "Volver a empezar", the help dialog and the cookie banner; plus the figure's pure geometry. `page.test.tsx` checks the home page renders the essay.
- **Contract** — `designContract.test.ts` reads the source tree: every plain JSX class exists in the global CSS, no Inter, every `<button>` has a `type`.

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
- **`'unsafe-inline'` in the CSP** ([next.config.js](next.config.js)) — the figures position their squares, lines and labels with server-rendered `style` attributes, which a CSP without `'unsafe-inline'` for styles blocks.
- **Cookie banner default = no consent.** GA only loads after explicit accept. Don't pre-load `gtag.js`.
