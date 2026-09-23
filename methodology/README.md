# Methodology for [comparatuingreso.es](https://comparatuingreso.es/)

> [!NOTE]  
> [🇪🇸] La nota metodológica está disponible en inglés para facilitar la colaboración con otros investigadores y la reutilización de los scripts. ¡Gracias por tu interés!

<!-- [🇪🇸] Esta carpeta contiene los scripts y documentación metodológica utilizados para validar las estimaciones de distribución de ingresos presentadas en [comparatuingreso.es](https://comparatuingreso.es/). El objetivo es garantizar la transparencia y rigor metodológico en la estimación de la posición relativa en la distribución de ingresos de España.  -->

This folder contains the scripts that build the income distributions used by [comparatuingreso.es](https://comparatuingreso.es/), a publicly available web platform that enables Spanish households to calculate their relative position within the income distribution, together with the methodological note that documents and validates them. The web app itself lives at the root of this repository.

## Data

- _Atlas de Distribución de Renta de los Hogares_ ([ADRH](https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177088&menu=ultiDatos&idp=1254735976608)) from the Spanish Statistical Office at the municipality and census tract levels
- [Census 2021](https://www.ine.es/censos2021/) data at the municipality and census tract levels
- _Encuesta de Condiciones de Vida_ ([ECV](https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176807&menu=ultiDatos&idp=1254735976608)), national mean equivalised income, used to nowcast ADRH incomes to the current year

## Code structure

| File name | Description | Input data required | Output |
|-----------|-------------|---------------------|---------|
| `0a. calculate_lognormal.r` | Example of how to calculate log-normal mixture, save `.dta` file for summary stats | ADRH tract data | `data-raw/atlas_all.dta` |
| `0b. summary_stats.do` | Summary statistics | ADRH data | `output/summary_stats.tex` |
| `0c. validation.do` | Validation metrics | ADRH data | `output/binned_scatter_p80p20.png`, `output/binned_scatter_median.png` |
| `0d. ecv_nowcast.r` | Nowcast factor: ECV national income growth, scaled by the historical ratio of ADRH to ECV growth | ADRH municipal data, ECV (INE table 9947) | `data-raw/nowcast_factor.fst` |
| `1. predict_gini_ml.r` | Implements ML model to predict missing Gini coefficients | ADRH tract data, demographic variables | `gini_predicted.fst` |
| `2. prep_lognormal.r` | Prepares income distributions using log-normal mixture, nowcast to the current year | ADRH data, predicted Gini, nowcast factor | National, provincial and municipal distributions and percentiles; municipality lookup |
| `3a. mun_stats.r` | Calculates municipal statistics for the ADRH base year | ADRH municipal data, Census data | `data-raw/municipality_stats_2023.fst` |
| `3c. apply_nowcast_mun_stats.r` | Nowcasts the municipal income statistic to the current year | Base-year municipal statistics, nowcast factor | `data/municipality_stats.fst` |
| `3b. tract_stats.r` | Processes tract-level statistics | ADRH tract data, Census tract data | Tract-level statistics |
| `4a. variance_decomp.r` | Calculates hierarchical variance decomposition | ADRH data | `output/variance_decomp.png` |
| `4b. variance_decomp_all.r` | Calculates hierarchical variance decomposition (national level) | ADRH data | Figures for the text in the methodological note |

Scripts are run from this folder (paths such as `data/` and `data-raw/` are relative to it). To rebuild everything the app uses, run from anywhere:

```bash
bash methodology/run_pipeline.sh
```

which runs `0d`, `2` and `3c`, then converts the outputs in `data/` to the Arrow files in `../public/data/`. Set `RUN_GINI_MODEL=1` to also re-fit the Gini model (`1`), and `TRACT_TABLES_DIR` to the folder with the INE tract tables (`tract_foreign_raw.csv`, `tract_educ_raw.csv`) to also rebuild the base-year municipal statistics (`3a`). Generated outputs in `data/` are not kept in the repository.

All necessary packages will be installed automatically when running the R scripts. 

<!-- For `ineAtlas`, you will need to install the development version from GitHub:

```r
pak::pak("pablogguz/ineAtlas")
``` -->

The do-files require the `estout` and `binsreg` packages. If you don't have them installed, you can do so by running:

```stata
ssc install estout 
ssc install binsreg
```

A full methodology note is available [here](./tex/note.pdf).