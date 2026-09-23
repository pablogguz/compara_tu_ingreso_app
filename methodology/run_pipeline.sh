#!/usr/bin/env bash
#
# Rebuild the app's data from the INE sources:
#   ADRH + ECV  ->  methodology/data/*.fst  ->  public/data/*.arrow
#
# Usage (from anywhere):   bash methodology/run_pipeline.sh
#
# Steps 1 and 3a are slow or need extra inputs and are skipped by default:
#   RUN_GINI_MODEL=1        also re-fit the Gini imputation model (1.)
#   TRACT_TABLES_DIR=/path  also rebuild the base-year municipal stats (3a.)
set -euo pipefail

cd "$(dirname "$0")"                      # methodology/
mkdir -p data data-raw

run() { echo; echo "==> $1"; Rscript "code/$1"; }

run "0d. ecv_nowcast.r"
if [[ "${RUN_GINI_MODEL:-0}" == "1" ]]; then run "1. predict_gini_ml.r"; fi
run "2. prep_lognormal.r"
if [[ -n "${TRACT_TABLES_DIR:-}" ]]; then run "3a. mun_stats.r"; fi
run "3c. apply_nowcast_mun_stats.r"

cd ..                                     # repository root
echo; echo "==> scripts/convert-data.R"
Rscript scripts/convert-data.R
