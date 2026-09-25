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
- INE annual population census, tract tables exported as CSV: education and place of birth, for the municipal context indicators shown in the app (not used in the estimation).

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
| `3b. tract_stats.r` | Tract-level statistics (not used by the app) | `data/tract_*` |

`data-raw/` holds small inputs kept in the repository; `data/` is regenerated and not kept.

## Rebuilding

```bash
bash methodology/run_pipeline.sh
```

runs `0d`, `1b`, `2`, `3a`, `3c`, the Arrow conversion, `5` and `6` (a few minutes; the GB2 fit uses up to 10 cores). Options:

- `RUN_GINI_MODEL=1` also re-fits the Gini model (`1`);
- `RUN_HOLDOUT=1` also re-runs the leave-one-share-out validation (`1c`) — do so whenever the GB2 fit or the data change, since the note reports it;
- `TRACT_TABLES_DIR=/path/to/csvs` also rebuilds the census columns of the municipal statistics from the INE tract tables (`tract_foreign_raw.csv`, `tract_educ_raw.csv`); without it, `3a` rebuilds only the income columns and keeps the census columns of the existing base-year file;
- `BUILD_NOTE=1` also rebuilds the note.

The note is built with `bash methodology/tex/build_note.sh` (needs a TeX distribution). Its numbers, tables and figures all come from the pipeline, so rebuilding it after the pipeline updates the note to the latest data. The build fails if any reference or citation is unresolved.

When the ADRH or the AEAT annual report publish a new year, bump `BASE_INCOME_YEAR` and `TARGET_INCOME_YEAR` in `0d`, the census periods in `3a` if the tract tables are refreshed, and `src/lib/years.ts` in the app, and run with `RUN_GINI_MODEL=1 RUN_HOLDOUT=1`. R packages are installed by the scripts if missing (R 4.3 or later).
