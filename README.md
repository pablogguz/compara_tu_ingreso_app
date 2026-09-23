# Compara tu ingreso

[comparatuingreso.es](https://comparatuingreso.es) tells a household where its income sits in the Spanish income distribution: nationally, in its province and in its municipality. It is built on the Spanish Statistical Office's *Atlas de Distribución de Renta de los Hogares* (ADRH), which is derived from personal income-tax records for every census tract in the country.

This repository holds everything behind the site:

- **the web app** (Next.js), at the root;
- **the methodology**: the R pipeline that builds the income distributions from the INE sources, and the methodological note, in [`methodology/`](methodology/).

## How it works

1. For each of the ~37,000 census tracts, the ADRH reports net equivalised income (median and mean) and a Gini coefficient. Each tract's income distribution is modelled as a log-normal: σ follows from the Gini, the location from the median.
2. Where the ADRH suppresses a tract's Gini, it is imputed with a gradient-boosted model on tract characteristics.
3. The tract distributions are combined, weighted by population, into national, provincial and municipal distributions, whose percentiles are solved numerically.
4. The latest ADRH year (2023) is nowcast to 2024 with the growth of mean equivalised income in the Living Conditions Survey (ECV), scaled by how ECV growth has historically compared with ADRH growth.
5. In the browser, the user's household income is equivalised with the modified OECD scale and located in those distributions.

The full method and its validation are in the [methodological note](methodology/tex/note.pdf).

## Repository layout

```
├── src/                     Next.js app (App Router, React, TypeScript)
├── public/data/             Arrow files the app loads (built by the pipeline)
├── public/css/              stylesheets
├── tests/                   Vitest + Testing Library
├── scripts/convert-data.R   pipeline output (FST) -> public/data (Arrow)
└── methodology/
    ├── code/                R (and Stata) scripts, numbered in run order
    ├── data-raw/            small inputs kept in the repository
    ├── output/              figures and tables used in the note
    ├── tex/                 the methodological note (note.pdf) and its sources
    └── run_pipeline.sh      rebuild public/data from the INE sources
```

## Running the app

Requires Node.js 18 or later.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit, component and flow tests
npm run build    # production build
```

Every screen can also be opened directly, without going through the questionnaire, at `/mocks` (development and preview builds only).

The app runs without any configuration. Two optional features read environment variables (in `.env.local` locally, or in the hosting provider's settings):

| Variable | Used for |
|---|---|
| `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEET_ID` | storing answers anonymously for research, only after the visitor accepts cookies |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics, only after the visitor accepts cookies |
| `NEXT_PUBLIC_SITE_URL` | absolute URLs for the social-media preview image |

See [DEPLOYMENT.md](DEPLOYMENT.md) for setting these up.

## Rebuilding the data

Requires R (4.3 or later). The scripts install their own packages; the INE data is downloaded with [`ineAtlas`](https://github.com/pablogguz/ineAtlas) (ADRH) and [`ineapir`](https://github.com/es-ine/ineapir) (ECV).

```bash
bash methodology/run_pipeline.sh
```

This nowcasts, rebuilds every distribution and percentile table, and writes `public/data/`. Two steps are skipped unless asked for: re-fitting the Gini imputation model (`RUN_GINI_MODEL=1`) and recomputing the base-year municipal statistics, which needs INE tract tables exported as CSV (`TRACT_TABLES_DIR=/path/to/csvs`). See [`methodology/README.md`](methodology/README.md) for what each script does.

The note is rebuilt with `bash methodology/tex/build_note.sh` (needs a TeX distribution).

## License

The code is released under the [MIT License](LICENSE). The methodological note and its figures are released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The underlying data are published by the Instituto Nacional de Estadística (INE) and reused under its terms of use.

## Author

[Pablo García Guzmán](https://github.com/pablogguz)
