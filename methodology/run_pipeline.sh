#!/usr/bin/env bash
#
# Rebuild the app's data and the methodology note's numbers from the INE sources:
#   ADRH + ECV  ->  methodology/data/*.fst  ->  public/data/*.arrow
#               ->  methodology/output/ (figures, tables), methodology/tex/numbers.tex
#
# Usage (from anywhere):   bash methodology/run_pipeline.sh
#
# Optional steps:
#   RUN_GINI_MODEL=1        also re-fit the Gini imputation model (1.)
#   RUN_HOLDOUT=1           also re-run the leave-one-share-out validation of the
#                           tract GB2 fits (1c., nine refits)
#   TRACT_TABLES_DIR=/path  also rebuild the census columns of the base-year
#                           municipal statistics (3a.); without it, 3a. only
#                           rebuilds the income columns
#   BUILD_NOTE=1            also rebuild tex/note.pdf (needs a TeX distribution)
set -euo pipefail

cd "$(dirname "$0")"                      # methodology/
mkdir -p data data-raw output

run() { echo; echo "==> $1"; Rscript "code/$1"; }

run "0d. ecv_nowcast.r"
if [[ "${RUN_GINI_MODEL:-0}" == "1" ]]; then run "1. predict_gini_ml.r"; fi
run "1b. fit_gb2.r"
if [[ "${RUN_HOLDOUT:-0}" == "1" ]]; then run "1c. gb2_holdout.r"; fi
run "2. prep_distributions.r"
run "3a. mun_stats.r"
run "3c. apply_nowcast_mun_stats.r"

echo; echo "==> scripts/convert-data.R"
(cd .. && Rscript scripts/convert-data.R)

run "5. note_figures.r"
run "6. note_numbers.r"

if [[ "${BUILD_NOTE:-0}" == "1" ]]; then echo; echo "==> tex/build_note.sh"; bash tex/build_note.sh; fi
