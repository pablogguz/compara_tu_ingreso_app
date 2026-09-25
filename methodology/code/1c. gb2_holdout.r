#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: leave-one-share-out validation of the tract GB2 fits.
#*   For each of the nine published shares, refits every tract with the
#*   share removed from its targets and scores the held-out share against
#*   the published one, over the tracts that publish shares. Slow (nine
#*   full refits); run with RUN_HOLDOUT=1 in run_pipeline.sh.
#*
#* Input : data/tract_targets.fst, data/mun_shares.fst, data/gb2_fit_info.fst (1b. fit_gb2.r)
#* Output: data-raw/gb2_holdout.fst
#-------------------------------------------------------------

packages_to_load <- c("data.table", "fst", "matrixStats")
invisible(lapply(packages_to_load, function(p) {
  if (!require(p, character.only = TRUE)) install.packages(p, dependencies = TRUE)
  suppressPackageStartupMessages(require(p, character.only = TRUE))
}))
source("code/gb2_engine.r")

CORES <- max(1L, min(10L, parallel::detectCores()))
info <- read_fst("data/gb2_fit_info.fst")
gb2_setup(info$nat_median)
tr <- as.data.table(read_fst("data/tract_targets.fst"))
muns <- as.data.table(read_fst("data/mun_shares.fst"))

out <- rbindlist(lapply(SH, function(k) {
  f <- fit_gb2_full(tr, muns, cfg_name = "bal", cores = CORES, heldout = k)
  ind <- indicators(FAMILIES$gb2, f$P)
  d <- data.table(tract_code = f$tract_code, model = ind[, k])[tr, on = "tract_code"][has_shares == TRUE]
  e <- d$model - d[[k]]
  cat(sprintf("held out %-11s  MAE %.3f pp  (%.0f s)\n", k, weighted.mean(abs(e), d$w), f$seconds))
  data.table(share = k, oos_mae = weighted.mean(abs(e), d$w), oos_bias = weighted.mean(e, d$w),
             oos_p90 = { a <- abs(e); o <- order(a); a[o][which(cumsum(d$w[o]) / sum(d$w) >= 0.9)[1]] })
}))
write_fst(out, "data-raw/gb2_holdout.fst")
print(out)
cat("Saved data-raw/gb2_holdout.fst\n")
