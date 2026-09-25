#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: fits a GB2 to every census tract with core indicators
#*   (median, mean, Gini, P80/P20) by weighted minimum distance to the
#*   13 indicators the ADRH publishes for it (see gb2_engine.r). Tracts
#*   without core indicators get the log-normal fallback: sigma from the
#*   (imputed) Gini, location from the mean imputed from income per person.
#*   Everything in ADRH base-year euros; 2. prep_distributions.r nowcasts.
#*
#* Input : ADRH (ineAtlas), national median (INE table 53689),
#*         data-raw/gini_predicted.fst (1. predict_gini_ml.r)
#* Output: data/tract_fits.fst      one row per tract: GB2 or fallback parameters
#*         data/tract_targets.fst   published tract indicators, fallback and flags
#*         data/mun_shares.fst      published municipal shares (for the share prior)
#*         data/gb2_fit_info.fst    one row: settings and fit diagnostics
#-------------------------------------------------------------

packages_to_load <- c("data.table", "fst", "ineAtlas", "ineapir", "matrixStats")
invisible(lapply(packages_to_load, function(p) {
  if (!require(p, character.only = TRUE)) install.packages(p, dependencies = TRUE)
  suppressPackageStartupMessages(require(p, character.only = TRUE))
}))
source("code/gb2_engine.r")

BASE_YEAR <- read_fst("data-raw/nowcast_factor.fst")$base_income_year
CORES <- max(1L, min(10L, parallel::detectCores()))

#-------------------------------------------------------------
# 1. ADRH tract data, base year
#-------------------------------------------------------------
share_cols <- c(below_5000 = "equivinc_below_5000", below_7500 = "equivinc_below_7500",
                below_10000 = "equivinc_below_10000", below_40p = "equivinc_below_40p_median",
                below_50p = "equivinc_below_50p_median", below_60p = "equivinc_below_60p_median",
                above_140p = "equivinc_above_140p_median", above_160p = "equivinc_above_160p_median",
                above_200p = "equivinc_above_200p_median")

inc <- setDT(get_atlas("income", "tract"))[year == BASE_YEAR]
dem <- setDT(get_atlas("demographics", "tract"))[year == BASE_YEAR, .(tract_code, population)]
gp  <- setDT(get_atlas("gini_p80p20", "tract"))[year == BASE_YEAR, .(tract_code, gini, p80p20)]
dst <- setDT(get_atlas("distribution_sex", "tract"))[year == BASE_YEAR & sex == "total", c("tract_code", share_cols), with = FALSE]
setnames(dst, share_cols, names(share_cols))
dsm <- setDT(get_atlas("distribution_sex", "municipality"))[year == BASE_YEAR & sex == "total", c("mun_code", share_cols), with = FALSE]
setnames(dsm, share_cols, names(share_cols))

a <- Reduce(function(x, y) merge(x, y, by = "tract_code", all.x = TRUE),
            list(inc[, .(tract_code, mun_code, mun_name, prov_code, prov_name, net_income_pc,
                         mean = net_income_equiv, median = median_income_equiv)], dem, gp, dst))

# National median of the base year: the reference of the relative thresholds
nat <- as.data.table(get_data_table(idTable = 53689, nlast = 5, unnest = TRUE, tip = "A"))
nat_median <- nat[Anyo == BASE_YEAR & grepl("^Total Nacional\\..*Mediana de la renta por unidad de consumo", Nombre), Valor]
stopifnot(length(nat_median) == 1)
gb2_setup(nat_median)

#-------------------------------------------------------------
# 2. Log-normal fallback (tracts without core indicators) and the tract universe
#-------------------------------------------------------------
# Mean per consumption unit imputed from income per person with the provincial,
# population-weighted ratio of the two; Gini imputed by 1. predict_gini_ml.r.
a[, ratio := weighted.mean(mean / net_income_pc, w = population, na.rm = TRUE), by = prov_code]
a[, equiv_is_imputed := as.integer(is.na(mean) & !is.na(net_income_pc))]
a[, mean_imp := fifelse(is.na(mean), net_income_pc * ratio, mean)]
gpred <- as.data.table(read_fst("data-raw/gini_predicted.fst"))
a[, gini_is_imputed := as.integer(is.na(gini) & tract_code %in% gpred$tract_code)]
a[gpred, gini_all := i.gini, on = "tract_code"]
a[is.na(gini_all), gini_all := gini]

# universe: population, a Gini (published or imputed) and a median or mean
tr <- a[!is.na(gini_all) & !is.na(population) & (!is.na(median) | !is.na(mean_imp))]
tr[, fb_sigma := sqrt(2) * qnorm((gini_all / 100 + 1) / 2)]
tr[, mu_from_median := as.integer(!is.na(median) & median > 0)]
tr[, fb_mu := fifelse(mu_from_median == 1L, log(median), log(mean_imp) - fb_sigma^2 / 2)]
tr[, w := population]
tr[, has_core := !is.na(median) & !is.na(mean) & !is.na(gini) & !is.na(p80p20)]
tr[, has_shares := !is.na(below_5000)]
setorder(tr, tract_code)

cat(sprintf("Tracts: %d | core indicators: %d | with shares: %d | fallback: %d\n",
            nrow(tr), sum(tr$has_core), sum(tr$has_shares), sum(!tr$has_core)))

#-------------------------------------------------------------
# 3. GB2 fits
#-------------------------------------------------------------
muns <- dsm
fit <- fit_gb2_full(tr, muns, cfg_name = "bal", cores = CORES)
ind <- indicators(FAMILIES$gb2, fit$P)
cat(sprintf("GB2 fit: %d tracts in %.1f s on %d cores, converged %.4f, mean iterations %.1f\n",
            length(fit$tract_code), fit$seconds, CORES, mean(fit$converged), mean(fit$iters)))

#-------------------------------------------------------------
# 4. Save
#-------------------------------------------------------------
g <- data.table(tract_code = fit$tract_code, a = fit$P$a, lb = fit$P$lb, p = fit$P$p, q = fit$P$q,
                ssr = fit$ssr, converged = fit$converged, iters = fit$iters)
fitted <- as.data.table(ind); setnames(fitted, paste0("fit_", IND13)); fitted[, tract_code := fit$tract_code]

out <- merge(tr[, .(tract_code, mun_code, mun_name, prov_code, prov_name, population,
                    mu = fb_mu, sigma = fb_sigma, gini = gini_all, gini_is_imputed, mu_from_median,
                    equiv_is_imputed, net_income_equiv = mean_imp, net_income_pc, has_core, has_shares)],
             g, by = "tract_code", all.x = TRUE)
out <- merge(out, fitted, by = "tract_code", all.x = TRUE)
out[, dist := fifelse(is.na(a), "lognormal", "gb2")]
out[, share_source := fifelse(has_shares, "published", fifelse(has_core, "prior", NA_character_))]
setcolorder(out, c("tract_code", "mun_code", "mun_name", "prov_code", "prov_name", "population", "dist",
                   "a", "lb", "p", "q", "mu", "sigma"))
write_fst(out, "data/tract_fits.fst")
write_fst(tr[, c("tract_code", "mun_code", "prov_code", "w", IND13, "fb_mu", "fb_sigma", "has_core", "has_shares"), with = FALSE],
          "data/tract_targets.fst")
write_fst(muns, "data/mun_shares.fst")

info <- data.table(
  base_year = BASE_YEAR, nat_median = nat_median, n_tracts = nrow(tr), n_core = sum(tr$has_core),
  n_shares = sum(tr$has_shares), n_prior = sum(tr$has_core & !tr$has_shares), n_fallback = sum(!tr$has_core),
  n_prior_train = fit$n_prior_train, gap_muns = fit$gap_muns, prior_rmse_mean = mean(fit$prior_rmse),
  converged = mean(fit$converged), mean_iters = mean(fit$iters), seconds = fit$seconds, cores = CORES,
  tol_share = CONFIGS$bal$tol_share, tol_gini = CONFIGS$bal$tol_gini, tol_mean = CONFIGS$bal$tol_mean,
  tol_p = CONFIGS$bal$tol_p, med_pull = CONFIGS$bal$med_pull, med_out = CONFIGS$bal$med_out,
  cap_allow = formals(build_targets)$allow
)
write_fst(info, "data/gb2_fit_info.fst")
cat("Saved data/tract_fits.fst, data/tract_targets.fst, data/mun_shares.fst and data/gb2_fit_info.fst\n")
