# Methodology for [comparatuingreso.es](https://comparatuingreso.es/)

> [!NOTE]  
> [🇪🇸] La nota metodológica está disponible en inglés para facilitar la colaboración con otros investigadores y la reutilización de los scripts. ¡Gracias por tu interés!

This folder contains the scripts that build the income distributions used by [comparatuingreso.es](https://comparatuingreso.es/), a public web tool that tells a household where its income sits in the income distribution of Spain, its province and its municipality, together with the methodological note that documents and validates them ([`tex/note.pdf`](./tex/note.pdf)). The web app itself lives at the root of this repository.

## Method in brief

1. Each census tract's distribution of income per consumption unit is a GB2 (generalized beta of the second kind), fitted by weighted minimum distance to the 13 indicators the ADRH publishes for the tract: median, mean, Gini, P80/P20 and the shares of the population below/above nine income thresholds. Published medians are treated as €700 intervals and values at INE's caps as censored. Tracts without published shares (under 500 residents) get pseudo-share targets from a regression prior, adjusted to their municipality's published shares.
2. Tracts without these indicators (under 100 residents) get a log-normal: σ from a Gini imputed with an XGBoost model on tract demographics, log income and province dummies, location from the mean imputed from income per person.
3. National, provincial and municipal distributions are population-weighted mixtures of their tracts; percentiles 1–99 are solved numerically.
4. Incomes are nowcast from the latest ADRH year to the latest year in the Agencia Tributaria's annual tax revenue report, with the growth of household income (excluding capital gains, net of income tax, per person) in that report, scaled by the historical ratio of ADRH to AEAT growth (every GB2 scale b → k·b). A pseudo-real-time backtest measures the error.

The note validates the result out of sample on what the fits do not target — the medians, Gini coefficients and P80/P20 ratios of national, provincial and municipal distributions, and tract shares left out of the fit in turn — and documents its limitations, chiefly a remaining understatement of the share of the population below €5,000.

## Data

- _Atlas de Distribución de Renta de los Hogares_ ([ADRH](https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177088&menu=ultiDatos&idp=1254735976608)), INE: income, inequality, income-threshold shares and demographic indicators by census tract and municipality, loaded with [`ineAtlas`](https://github.com/pablogguz/ineAtlas); national and provincial totals from the INE API with [`ineapir`](https://github.com/es-ine/ineapir) (the national median behind the relative thresholds, and validation).
- _Informe Anual de Recaudación Tributaria_ ([AEAT](https://sede.agenciatributaria.gob.es/Sede/estadisticas/recaudacion-tributaria/informe-anual.html)), table 2.1 "Rentas de los hogares e IRPF": national household income from tax sources and income tax accrued, used for the nowcast (cached in `data-raw/aeat_rentas_hogares_<year>.xlsx`); population from Eurostat (`nama_10_pe`).
- INE annual population census, results by census tract (tables 66592 and 65031, with municipal totals): education of those aged 15+ (1 January 2024) and place of birth (1 January 2025), for the municipal context indicators shown in the app (not used in the estimation). Their municipal rows are cached in `data-raw/census_<table>_<period>.csv`.

## Replication package

This folder is self-contained: it holds everything needed to rebuild the note, and nothing else.

```
methodology/
├── run_pipeline.sh        # runs the whole chain, from the sources to the note
├── code/                  # the R pipeline (below)
├── data-raw/              # inputs kept in the repository
│   ├── aeat_rentas_hogares_2025.xlsx    # AEAT table behind the nowcast (snapshot)
│   ├── eurostat_population.csv          # Spain's population, Eurostat nama_10_pe (snapshot, with its vintage)
│   ├── census_65031_2025.csv            # INE census, place of birth, municipal rows
│   ├── census_66592_2024.csv            # INE census, education, municipal rows
│   ├── gini_predicted.fst, gini_model_cv.fst   # Gini imputation (step 1), reused unless re-fitted
│   └── gb2_holdout.fst                  # held-out validation (step 1c), reused unless re-run
├── output/                # the note's figures and tables (generated)
└── tex/                   # the note: sources, numbers.tex (generated) and note.pdf
```

`data/` and the other files in `data-raw/` (the nowcast factor and series, the base-year municipal statistics) are regenerated on every run and are not kept.

**Requirements.** R 4.3 or later (tested with 4.5.2); the scripts install the packages they use if missing (data.table, fst, tidyverse, matrixStats, xgboost, readxl, jsonlite, ineAtlas, ineapir, arrow, ragg, systemfonts, scales). A TeX distribution with `pdflatex` and `bibtex` to build the note. Internet access: the ADRH is downloaded with `ineAtlas` and the published totals from the INE API; the AEAT, Eurostat and census inputs are read from `data-raw/`. The figures use the Source Serif 4 font if it is installed and the default serif otherwise.

**Reproduce everything** (about 10 minutes on a 10-core laptop):

```bash
RUN_GINI_MODEL=1 RUN_HOLDOUT=1 BUILD_NOTE=1 bash methodology/run_pipeline.sh
```

Without the options, the run reuses the Gini imputation and the held-out validation kept in `data-raw/` and does not rebuild the PDF (a few minutes). Each step's output is listed below; the note's numbers are written to `tex/numbers.tex`, its tables and figures to `output/`, and the app's data to `../public/data/`.

**What can differ.** The ADRH and the INE totals are read live, so a later run uses whatever the INE publishes then (the pipeline stops if the ADRH has a newer year than the one it is set to, so that the years are bumped deliberately). The AEAT table, the Eurostat population and the census rows are snapshots in `data-raw/` and do not change unless replaced: delete one to take the latest vintage. From a fresh copy of the repository, a run reproduces the note's numbers, tables and figures and the app's data bit for bit.

## Code

Scripts are run from this folder (paths such as `data/` and `data-raw/` are relative to it), in this order. The ADRH year is set once, as `BASE_INCOME_YEAR` in `0d`; every later script reads it from `data-raw/nowcast_factor.fst`.

| Script | What it does | Output |
|--------|--------------|--------|
| `0d. nowcast.r` | Nowcast factor: AEAT household income growth in each year after the ADRH times ρ, the ratio of ADRH to AEAT growth over the years both cover; pseudo-real-time backtest | `data-raw/nowcast_factor.fst`, `data-raw/nowcast_series.fst`, `data-raw/nowcast_backtest.fst` |
| `1. predict_gini_ml.r` | Imputes the Gini of tracts without one (for their log-normal) with XGBoost; compares it with OLS and a constant on the same cross-validation folds | `data-raw/gini_predicted.fst`, `data-raw/gini_model_cv.fst` |
| `1b. fit_gb2.r` | Fits a GB2 to every tract with core indicators (weighted minimum distance to the 13 published indicators); log-normal fallback for the rest | `data/tract_fits.fst`, `data/tract_targets.fst`, `data/mun_shares.fst`, `data/gb2_fit_info.fst` |
| `1c. gb2_holdout.r` | Leave-one-share-out validation of the GB2 fits (nine refits) | `data-raw/gb2_holdout.fst` |
| `2. prep_distributions.r` | Nowcast; national, provincial and municipal mixtures: percentiles, density curves (closed-form GB2 density), municipality lookup | `data/*.fst` (incl. `data/tract_params.fst`) |
| `3a. mun_stats.r` | Base-year municipal statistics: equivalised income (ADRH), higher education and foreign-born shares (census), with `*_is_imputed` flags set before imputation | `data-raw/municipality_stats_<year>.fst` |
| `3c. apply_nowcast_mun_stats.r` | Nowcasts the municipal income statistic | `data/municipality_stats.fst` |
| `../scripts/convert-data.R` | Converts the app's FST files to Arrow (uncompressed Feather v2) | `../public/data/*.arrow` |
| `5. note_figures.r` | The note's figures | `output/fig_*.png` |
| `6. note_numbers.r` | Every number quoted in the note, as LaTeX macros, and the note's tables | `tex/numbers.tex`, `output/table_*.tex` |
| `gb2_engine.r` | GB2 engine: indicators, residuals, vectorised Levenberg–Marquardt solver, targets and tolerances, share prior, mixtures (sourced, not run) | |
| `note_data.r` | Helpers shared by `5.` and `6.` (sourced, not run) | |

## Options and updates

`run_pipeline.sh` runs `0d`, `1b`, `2`, `3a`, `3c`, the Arrow conversion, `5` and `6`. Options:

- `RUN_GINI_MODEL=1` also re-fits the Gini model (`1`);
- `RUN_HOLDOUT=1` also re-runs the leave-one-share-out validation (`1c`) — do so whenever the GB2 fit or the data change, since the note reports it;
- `CENSUS_REFRESH=1` re-downloads the two census tables (0.2–0.35 GB each) instead of using their cached municipal rows;
- `BUILD_NOTE=1` also rebuilds the note (or run `bash methodology/tex/build_note.sh`). The build fails if any reference or citation is unresolved.

When the ADRH or the AEAT annual report publish a new year, bump `BASE_INCOME_YEAR` and `TARGET_INCOME_YEAR` in `0d` (the AEAT table of the new year is downloaded to `data-raw/`: remove the old one, and delete `eurostat_population.csv` to refresh the population), the census periods in `3a` when the INE adds a census year, and `src/lib/years.ts` in the app, and run with `RUN_GINI_MODEL=1 RUN_HOLDOUT=1 BUILD_NOTE=1`.
