#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: every number quoted in the methodology note, from the
#*   latest cross-section (ADRH base year, nowcast to the target year) and
#*   the tract GB2 fits. Run last in run_pipeline.sh.
#*
#* Output: tex/numbers.tex              \newcommand macros used in the text
#*         output/table_summary.tex     Table 1, summary statistics
#*         output/table_gini_cv.tex     Table 2, Gini imputation models
#*         output/table_aggregate.tex   Table 3, model vs ADRH statistics
#*         output/table_thresholds.tex  Table 4, shares below thresholds
#-------------------------------------------------------------

packages_to_load <- c("data.table", "fst", "ineAtlas", "ineapir", "matrixStats")
invisible(lapply(packages_to_load, function(p) {
  if (!require(p, character.only = TRUE)) install.packages(p, dependencies = TRUE)
  suppressPackageStartupMessages(require(p, character.only = TRUE))
}))
source("code/note_data.r")
dir.create("output", showWarnings = FALSE)

#-------------------------------------------------------------
# Formatting and the macro writer
#-------------------------------------------------------------
num1 <- function(x, d, signed) {
  s <- formatC(abs(x), format = "f", digits = d, big.mark = ",")
  zero <- as.numeric(formatC(abs(x), format = "f", digits = d)) == 0
  if (x < 0 && !zero) paste0("$-$", s) else if (signed && x > 0 && !zero) paste0("$+$", s) else s
}
num <- function(x, d = 0, signed = FALSE) unname(vapply(x, num1, "", d = d, signed = signed))
macros <- list()
mac <- function(name, value) {
  stopifnot(grepl("^[A-Za-z]+$", name), is.null(macros[[name]]))
  macros[[name]] <<- value
}
wmean <- function(x, w) weighted.mean(x, w)

#-------------------------------------------------------------
# Inputs
#-------------------------------------------------------------
series  <- as.data.table(read_fst("data-raw/nowcast_series.fst"))
cv      <- as.data.table(read_fst("data-raw/gini_model_cv.fst"))
holdout <- as.data.table(read_fst("data-raw/gb2_holdout.fst"))
tf      <- tract_fits()                                           # base-year euros
tp      <- as.data.table(read_fst("data/tract_params.fst"))      # nowcast
np      <- read_fst("data/national_percentiles.fst")$value
lk      <- as.data.table(read_fst("data/municipality_lookup.fst"))

atlas  <- adrh_tracts()
mun    <- merge(setDT(get_atlas("income", "municipality"))[year == BASE_YEAR],
                setDT(get_atlas("gini_p80p20", "municipality"))[year == BASE_YEAR, .(mun_code, gini, p80p20)],
                by = "mun_code", all.x = TRUE)
targets <- as.data.table(read_fst("data/tract_targets.fst"))

# ADRH published totals for Spain and the provinces (INE tables). Province
# rows have small territorial ids; communities and Spain have large ones.
ine_table <- function(id) {
  d <- as.data.table(get_data_table(idTable = id, nlast = 5, unnest = TRUE, tip = "AM",
                                    metanames = TRUE, metacodes = TRUE))
  terr <- grep("territoriales$", names(d), value = TRUE)
  stopifnot(length(terr) == 1)
  d <- d[Anyo == BASE_YEAR, .(nombre = Nombre, unit_code = get(paste0(terr, ".Codigo")),
                              unit_id = get(paste0(terr, ".Id")), value = Valor)]
  if (!nrow(d)) stop("INE table ", id, " has no data for ", BASE_YEAR)
  d
}
pick <- function(d, pattern, level = c("national", "province")) {
  level <- match.arg(level)
  d <- d[grepl(pattern, nombre)]
  if (level == "national") d[unit_code == "00"] else d[unit_id < 1000]
}
t_mean  <- ine_table(53689)   # Indicadores de renta media y mediana
t_gini  <- ine_table(53688)   # Indice de Gini y P80/P20
t_fixed <- ine_table(53690)   # % below fixed thresholds, by sex
t_rel   <- ine_table(53694)   # % below/above relative thresholds, by sex

adrh_median <- pick(t_mean, "Mediana de la renta por unidad de consumo")$value
adrh_mean   <- pick(t_mean, "Media de la renta por unidad de consumo")$value
adrh_gini   <- pick(t_gini, "Gini")$value
adrh_p8020  <- pick(t_gini, "P80/P20")$value
stopifnot(length(adrh_median) == 1, length(adrh_mean) == 1, length(adrh_gini) == 1, length(adrh_p8020) == 1,
          adrh_median == FIT_INFO$nat_median)

#-------------------------------------------------------------
# Data: summary statistics and coverage (ADRH base year)
#-------------------------------------------------------------
atlas[, dependency_ratio := (pct_under18 + pct_over65) / (100 - pct_under18 - pct_over65)]
pop_all <- sum(atlas$population, na.rm = TRUE)

mac("BaseYear", as.character(BASE_YEAR))
mac("TargetYear", as.character(TARGET_YEAR))
mac("TractsTotal", num(nrow(atlas)))
mac("TractPopMean", num(mean(atlas$population, na.rm = TRUE)))
mac("TractPopSD", num(sd(atlas$population, na.rm = TRUE)))
mac("TractEquivMean", num(mean(atlas$net_income_equiv, na.rm = TRUE)))
mac("TractPcMean", num(mean(atlas$net_income_pc, na.rm = TRUE)))
mac("EquivOverPcPct", num(100 * (mean(atlas$net_income_equiv, na.rm = TRUE) /
                                  mean(atlas$net_income_pc, na.rm = TRUE) - 1)))
mac("TractGiniMean", num(mean(atlas$gini, na.rm = TRUE), 1))
mac("TractDepRatioMean", num(mean(atlas$dependency_ratio, na.rm = TRUE), 2))
mac("TractMeanAge", num(mean(atlas$mean_age, na.rm = TRUE), 1))
mac("TractSingleHhMean", num(mean(atlas$pct_single_hh, na.rm = TRUE), 1))
mac("MissEquivPct", num(100 * mean(is.na(atlas$net_income_equiv)), 1))

miss_gini <- atlas[is.na(gini)]
stopifnot(all(is.na(miss_gini$median_income_equiv)), all(is.na(miss_gini$net_income_equiv)))
mac("GiniMissTracts", num(nrow(miss_gini)))
mac("GiniMissPct", num(100 * nrow(miss_gini) / nrow(atlas), 1))
mac("GiniMissPopPct", num(100 * sum(miss_gini$population, na.rm = TRUE) / pop_all, 1))
mac("GiniMissMedianPop", num(median(miss_gini$population, na.rm = TRUE)))
mac("ObsGiniMinPop", num(min(atlas[!is.na(gini), population])))
mac("GiniImputedTracts", num(sum(tf$gini_is_imputed)))
mac("TractsDropped", num(nrow(atlas) - nrow(tf)))
mac("LocMeanTracts", num(sum(tf$dist == "lognormal")))
mac("MissEquivAfterPct", num(100 * (nrow(atlas) - sum(!is.na(tf$net_income_equiv))) / nrow(atlas), 1))

# Shares below / above income thresholds, published for tracts with at least 500 residents
mac("ShareTracts", num(sum(targets$has_shares)))
mac("ShareTractsPopPct", num(100 * targets[has_shares == TRUE, sum(w)] / pop_all))

# Published medians: multiples of 350 euros (midpoints of 700-euro bins) outside Navarra
core_t <- targets[has_core == TRUE]
mac("MedBinnedPct", num(100 * mean(core_t$median %% 350 == 0), 1))

# ADRH top-coding of tract indicators (values bounded at the P99.5 across tracts)
cap_med <- max(atlas$median_income_equiv, na.rm = TRUE)
cap_gini <- max(atlas$gini, na.rm = TRUE)
mac("CapMedian", num(cap_med))
mac("CapTracts", num(atlas[median_income_equiv == cap_med, .N]))
mac("CapPopPct", num(100 * atlas[median_income_equiv == cap_med, sum(population)] / pop_all, 1))
mac("CapGini", num(cap_gini, 1))
mac("CapGiniTracts", num(atlas[gini == cap_gini, .N]))

mac("AdrhNatMedian", num(adrh_median))
mac("AdrhNatMean", num(adrh_mean))
mac("AdrhNatGini", num(adrh_gini, 1))
mac("AdrhNatPEightyTwenty", num(adrh_p8020, 1))

# Table 1
sum_row <- function(label, x, d) {
  sprintf("%s & %s & %s & %s & %s & %s \\\\", label, num(min(x, na.rm = TRUE), d), num(max(x, na.rm = TRUE), d),
          num(mean(x, na.rm = TRUE), d), num(sd(x, na.rm = TRUE), d), num(100 * mean(is.na(x)), 1))
}
writeLines(c(
  "\\begin{tabular}{@{}lccccc@{}}", "\\toprule",
  " & Min & Max & Mean & SD & \\% missing \\\\", "\\midrule",
  "\\multicolumn{6}{@{}l}{\\textit{Income distribution}} \\\\",
  sum_row("\\quad Net income per person (\\texteuro)", atlas$net_income_pc, 0),
  sum_row("\\quad Net income per consumption unit (\\texteuro)", atlas$net_income_equiv, 0),
  sum_row("\\quad Median income per consumption unit (\\texteuro)", atlas$median_income_equiv, 0),
  sum_row("\\quad Gini index", atlas$gini, 1),
  "\\multicolumn{6}{@{}l}{\\textit{Demographics}} \\\\",
  sum_row("\\quad Population", atlas$population, 0),
  sum_row("\\quad Dependency ratio", atlas$dependency_ratio, 2),
  sum_row("\\quad Mean age", atlas$mean_age, 1),
  sum_row("\\quad Single-person households (\\%)", atlas$pct_single_hh, 1),
  "\\midrule",
  sprintf("Census tracts & \\multicolumn{5}{l}{%s} \\\\", num(nrow(atlas))),
  "\\bottomrule", "\\end{tabular}"
), "output/table_summary.tex")

#-------------------------------------------------------------
# Municipalities
#-------------------------------------------------------------
tp_mun <- tf[, .(n_tracts = .N, all_fallback = all(dist == "lognormal"), pop = sum(population)),
             by = .(mun_code, prov_code)]
stopifnot(setequal(tp_mun$mun_code, lk$mun_code))
pop_total <- sum(tp_mun$pop)

mac("MunAdrh", num(uniqueN(mun$mun_code)))
mac("MunLookup", num(nrow(lk)))
mac("MunDropped", num(uniqueN(mun$mun_code) - nrow(lk)))
mac("MunSingleTract", num(tp_mun[n_tracts == 1, .N]))
mac("MunSingleTractPct", num(100 * tp_mun[n_tracts == 1, .N] / nrow(lk)))
mac("MunSingleTractPopPct", num(100 * tp_mun[n_tracts == 1, sum(pop)] / pop_total, 1))
synthetic <- tp_mun[all_fallback == TRUE]
mac("MunSynthetic", num(nrow(synthetic)))
mac("MunSyntheticPct", num(100 * nrow(synthetic) / nrow(lk)))
mac("MunSyntheticPopPct", num(100 * sum(synthetic$pop) / pop_total, 2))
mac("MunSyntheticIncomeValues", num(tf[mun_code %in% synthetic$mun_code,
                                        .(pc = round(weighted.mean(net_income_pc, population))), by = mun_code][, uniqueN(pc)]))

#-------------------------------------------------------------
# GB2 fits (1b. fit_gb2.r)
#-------------------------------------------------------------
mac("GbTracts", num(FIT_INFO$n_core))
mac("GbShareTracts", num(FIT_INFO$n_shares))
mac("GbPriorTracts", num(FIT_INFO$n_prior))
mac("GbPriorTrain", num(FIT_INFO$n_prior_train))
mac("GbGapMuns", num(FIT_INFO$gap_muns))
mac("GbPriorRMSE", num(FIT_INFO$prior_rmse_mean, 1))
mac("GbConvergedPct", num(100 * FIT_INFO$converged, 2))
mac("TolShare", num(FIT_INFO$tol_share, 1))
mac("TolGini", num(FIT_INFO$tol_gini, 2))
mac("TolMeanPct", num(100 * FIT_INFO$tol_mean))
mac("TolPPct", num(100 * FIT_INFO$tol_p))
mac("MedPullPct", num(100 * FIT_INFO$med_pull))
mac("MedOutPct", num(100 * FIT_INFO$med_out, 1))
mac("CapAllowPct", num(100 * FIT_INFO$cap_allow))

#-------------------------------------------------------------
# Tract-level fit (in sample) and leave-one-share-out hold-out
#-------------------------------------------------------------
val <- validation_tracts(tf, atlas)
w <- val$population
fit_skew <- wls(val$log_ratio_obs, val$log_ratio_fit, w)
fit_p <- wls(val$obs_p80p20, val$fit_p80p20, w)
mac("ValTracts", num(nrow(val)))
mac("FitMedInBinPct", num(100 * wmean(in_bin(val$fit_median, val$obs_median) %in% TRUE, w)))
mac("FitMeanAbsErr", num(100 * wmean(abs(val$fit_mean / val$obs_mean - 1), w), 1))
mac("FitGiniAbsErr", num(wmean(abs(val$fit_gini - val$obs_gini), w), 2))
mac("FitPAbsErr", num(100 * wmean(abs(val$fit_p80p20 / val$obs_p80p20 - 1), w), 1))
mac("ValSkewSlope", num(fit_skew$slope, 2))
mac("ValSkewRsq", num(fit_skew$r2, 2))
mac("ValPSlope", num(fit_p$slope, 2))
mac("ValPRsq", num(fit_p$r2, 2))

sv <- merge(tf[dist == "gb2" & has_shares == TRUE, c("tract_code", "population", paste0("fit_", SH)), with = FALSE],
            targets[, c("tract_code", SH), with = FALSE], by = "tract_code")
fit_share_mae <- sapply(SH, function(k) wmean(abs(sv[[paste0("fit_", k)]] - sv[[k]]), sv$population))
hold_mae <- setNames(holdout$oos_mae, holdout$share)[SH]
mac("FitShareMAE", num(mean(fit_share_mae), 2))
mac("HoldShareMAE", num(mean(hold_mae), 2))
mac("HoldShareMAEMin", num(min(hold_mae), 2))
mac("HoldShareMAEMax", num(max(hold_mae), 2))

#-------------------------------------------------------------
# Mixtures: root-finding accuracy, Spain, provinces and municipalities
# (base-year euros; out of sample for the non-additive statistics)
#-------------------------------------------------------------
tp[, wn := population / sum(population)]
root_err <- max(abs(sapply(np, function(q) sum(tp$wn * tract_cdf(tp, log(q)))) - (1:99) / 100))
mac("RootErrExp", as.character(ceiling(log10(root_err))))

nat <- mixture_stats(tf, tf$population)
nat_p8020_binned <- binned_p8020(nat[["p20"]], nat[["p80"]], adrh_median)
mac("AppNatMedian", num(np[50]))
mac("MixNatMedian", num(nat[["median"]]))
mac("MixNatMedianErr", num(100 * (nat[["median"]] / adrh_median - 1), 1, signed = TRUE))
mac("AdrhNatMedianLo", num(adrh_median - 350))
mac("AdrhNatMedianHi", num(adrh_median + 350))
stopifnot(isTRUE(in_bin(nat[["median"]], adrh_median)))
mac("MixNatMean", num(nat[["mean"]]))
mac("MixNatMeanErr", num(100 * (nat[["mean"]] / adrh_mean - 1), 2, signed = TRUE))
mac("MixNatGini", num(nat[["gini"]], 1))
mac("MixNatPEightyTwenty", num(nat[["p80"]] / nat[["p20"]], 2))
mac("MixNatPEightyTwentyBinned", num(nat_p8020_binned, 1))
mac("MixPOne", num(np[1] / FACTOR))

prov <- group_stats(tf, tf$prov_code); setnames(prov, "code", "prov_code")
prov <- merge(prov, pick(t_mean, "Mediana de la renta por unidad de consumo", "province")[, .(prov_code = unit_code, adrh_median = value)], by = "prov_code")
prov <- merge(prov, pick(t_gini, "Gini", "province")[, .(prov_code = unit_code, adrh_gini = value)], by = "prov_code")
prov <- merge(prov, pick(t_gini, "P80/P20", "province")[, .(prov_code = unit_code, adrh_p8020 = value)], by = "prov_code")
prov <- merge(prov, tf[, .(pop = sum(population)), by = prov_code], by = "prov_code")
stopifnot(nrow(prov) == uniqueN(tf$prov_code))

multi <- tp_mun[n_tracts >= 2, mun_code]
mm <- group_stats(tf[mun_code %in% multi], tf[mun_code %in% multi, mun_code]); setnames(mm, "code", "mun_code")
mm <- merge(mm, mun[, .(mun_code, adrh_median = median_income_equiv, adrh_gini = gini, adrh_p8020 = p80p20)], by = "mun_code")
mm <- merge(mm, tp_mun[, .(mun_code, pop)], by = "mun_code")
mm <- mm[!is.na(adrh_median) & !is.na(adrh_gini) & !is.na(adrh_p8020)]

rel <- function(model, adrh, w) {
  e <- 100 * (model / adrh - 1)
  list(mae = weighted.mean(abs(e), w), bias = weighted.mean(e, w), max = max(abs(e)))
}
pts <- function(model, adrh, w) { e <- model - adrh; list(mae = weighted.mean(abs(e), w), bias = weighted.mean(e, w)) }
pm <- prov[, rel(median, adrh_median, pop)]; pg <- prov[, pts(gini, adrh_gini, pop)]; pp8 <- prov[, rel(p80 / p20, adrh_p8020, pop)]
mmed <- mm[, rel(median, adrh_median, pop)]; mg <- mm[, pts(gini, adrh_gini, pop)]; mp8 <- mm[, rel(p80 / p20, adrh_p8020, pop)]

mac("ProvN", num(nrow(prov)))
mac("ProvMedAbsErr", num(pm$mae, 1))
mac("ProvMedInBinPct", num(100 * prov[, wmean(in_bin(median, adrh_median) %in% TRUE, pop)]))
mac("ProvGiniAbsErr", num(pg$mae, 2))
mac("ProvPAbsErr", num(pp8$mae, 1)); mac("ProvPBias", num(pp8$bias, 1, signed = TRUE))
mac("MunValN", num(nrow(mm)))
mac("MunMedAbsErr", num(mmed$mae, 1))
mac("MunMedInBinPct", num(100 * mm[, wmean(in_bin(median, adrh_median) %in% TRUE, pop)]))
mac("MunGiniAbsErr", num(mg$mae, 2))
mac("MunPAbsErr", num(mp8$mae, 1)); mac("MunPBias", num(mp8$bias, 1, signed = TRUE))

# Table 3
row_a <- function(label, adrh, model, d, d_adrh = d) {
  e <- 100 * (model / adrh - 1)
  sprintf("\\quad %s & %s & %s & %s \\\\", label, num(adrh, d_adrh), num(model, d),
          num(e, if (round(abs(e), 1) == 0) 2 else 1, signed = TRUE))
}
row_b <- function(label, n, r, d = 1) sprintf("\\quad %s & %s & %s & %s \\\\", label, num(n), num(r$mae, d), num(r$bias, d, signed = TRUE))
writeLines(c(
  "\\begin{tabular}{@{}lccc@{}}", "\\toprule",
  "\\textit{A. Spain} & ADRH & Model & Difference (\\%) \\\\", "\\midrule",
  row_a("Median (\\texteuro)", adrh_median, nat[["median"]], 0),
  row_a("Mean (\\texteuro)", adrh_mean, nat[["mean"]], 0),
  row_a("Gini index", adrh_gini, nat[["gini"]], 1),
  row_a("P80/P20", adrh_p8020, nat[["p80"]] / nat[["p20"]], 2, d_adrh = 1),
  "\\midrule",
  "\\textit{B. Provinces and municipalities} & Units & Mean abs.\\ diff. & Mean diff. \\\\", "\\midrule",
  row_b("Provinces: median (\\%)", nrow(prov), pm),
  row_b("Provinces: Gini index (points)", nrow(prov), pg, 2),
  row_b("Provinces: P80/P20 (\\%)", nrow(prov), pp8),
  row_b("Municipalities: median (\\%)", nrow(mm), mmed),
  row_b("Municipalities: Gini index (points)", nrow(mm), mg, 2),
  row_b("Municipalities: P80/P20 (\\%)", nrow(mm), mp8),
  "\\bottomrule", "\\end{tabular}"
), "output/table_aggregate.tex")

#-------------------------------------------------------------
# Shares of the population below income thresholds (Spain)
#-------------------------------------------------------------
thr <- data.table(
  id    = SH,
  label = c("Fixed amount", "Fixed amount", "Fixed amount", "40\\% of the median", "50\\% of the median",
            "60\\% of the median", "140\\% of the median", "160\\% of the median", "200\\% of the median"),
  pattern = c("debajo de 5.000 Euros", "debajo de 7.500 Euros", "debajo de 10.000 Euros", "debajo 40% de la mediana",
              "debajo 50% de la mediana", "debajo 60% de la mediana",
              "encima 140% de la mediana", "encima 160% de la mediana", "encima 200% de la mediana"),
  euros = THR
)
nat_rows <- rbind(t_fixed, t_rel)[unit_code == "00" & grepl("^Total Nacional\\. Total\\. ", nombre)]
thr[, adrh := sapply(pattern, function(p) { v <- nat_rows[grepl(p, nombre, fixed = TRUE), value]; stopifnot(length(v) == 1); v })]
thr[grepl("^above", id), adrh := 100 - adrh]          # everything as a share below
thr[, model := nat[SH]]
thr[grepl("^above", id), model := 100 - model]
thr[, diff := model - adrh]
thr[, `:=`(tract_fit = fit_share_mae[id], tract_holdout = hold_mae[id])]
setorder(thr, euros)

g <- function(k, v) thr[id == k][[v]]
mac("ThrFiveKObs", num(g("below_5000", "adrh"), 1));    mac("ThrFiveKModel", num(g("below_5000", "model"), 1))
mac("ThrOtherMaxDiff", num(max(abs(thr[id != "below_5000", diff])), 1))
mac("ThrAllMaxDiff", num(max(abs(thr$diff)), 1))   # all nine thresholds (abstract)
mac("ThrPovEuro", num(g("below_60p", "euros")))
mac("ThrPovObs", num(g("below_60p", "adrh"), 1));      mac("ThrPovModel", num(g("below_60p", "model"), 1))
mac("ThrPovModelP", num(floor(g("below_60p", "model"))))
mac("ThrPovObsP", num(floor(g("below_60p", "adrh"))))
mac("ThrTopEuro", num(g("above_200p", "euros")))
mac("ThrTopObs", num(100 - g("above_200p", "adrh"), 1)); mac("ThrTopModel", num(100 - g("above_200p", "model"), 1))

# Table 4
writeLines(c(
  "\\begin{tabular}{@{}lcccccc@{}}", "\\toprule",
  " & & \\multicolumn{3}{c}{Spain: share below (\\%)} & \\multicolumn{2}{c}{Tracts: MAE (pp)} \\\\ \\cmidrule(lr){3-5} \\cmidrule(l){6-7}",
  sprintf("Threshold & \\texteuro{} (%d) & ADRH & Model & Difference (pp) & Fitted & Held out \\\\", BASE_YEAR), "\\midrule",
  thr[, sprintf("%s & %s & %s & %s & %s & %s & %s \\\\", label, num(euros), num(adrh, 1), num(model, 1),
                num(diff, 1, signed = TRUE), num(tract_fit, 2), num(tract_holdout, 2))],
  "\\bottomrule", "\\end{tabular}"
), "output/table_thresholds.tex")

#-------------------------------------------------------------
# Gini imputation model (from 1. predict_gini_ml.r)
#-------------------------------------------------------------
cvm <- function(m, v) cv[model == m][[v]]
mac("CvFolds", num(cv$k_folds[1]))
mac("XgbRounds", num(cv$nrounds[1])); mac("XgbDepth", num(cv$max_depth[1])); mac("XgbEta", num(cv$eta[1], 1))
mac("GiniTrainTracts", num(cv$n_train[1]))
mac("GiniSD", num(cv$gini_sd[1], 2))
mac("GiniObsMean", num(cv$gini_obs_mean[1], 1))
mac("GiniPredMean", num(cv$gini_pred_mean[1], 1))
mac("OlsRMSE", num(cvm("ols", "rmse"), 2))
mac("XgbRMSE", num(cvm("xgb", "rmse"), 2)); mac("XgbRsq", num(cvm("xgb", "r2"), 2))
mac("XgbRMSEGain", num(100 * (1 - cvm("xgb", "rmse") / cvm("ols", "rmse")), 1))
mac("SmallTrainMin", num(cv$small_train_min[1]))
mac("SmallTestMaxPop", num(cv$small_train_min[1] - 1))
mac("SmallTestTracts", num(cv$n_small_test[1]))
mac("XgbSmallRMSE", num(cvm("xgb_small_tracts", "rmse"), 2))

cv_row <- function(label, m) sprintf("%s & %s & %s & %s & %s \\\\", label, num(cvm(m, "rmse"), 2),
                                     num(cvm(m, "mae"), 2), num(cvm(m, "mape"), 2), num(cvm(m, "r2"), 2))
writeLines(c(
  "\\begin{tabular}{@{}lcccc@{}}", "\\toprule",
  "Model & RMSE & MAE & MAPE (\\%) & $R^2$ \\\\", "\\midrule",
  cv_row("Constant (training mean)", "constant"),
  cv_row("OLS, province fixed effects", "ols"),
  cv_row("XGBoost, province dummies", "xgb"),
  "\\bottomrule", "\\end{tabular}"
), "output/table_gini_cv.tex")

#-------------------------------------------------------------
# Nowcast (from 0d. nowcast.r), its sensitivity and its backtest
#-------------------------------------------------------------
b <- series[!is.na(g_adrh) & !is.na(g_aeat)]
ahead <- series[!is.na(g_nowcast)][order(year)]
rho <- NOWCAST$rho
cum <- function(r) 100 * (prod(1 + r * ahead$g_aeat) - 1)
rho_last3 <- b[year > max(year) - 3, sum(g_adrh) / sum(g_aeat)]
rho_excl  <- b[!year %in% 2020:2021, sum(g_adrh) / sum(g_aeat)]
rho_orig  <- b[, sum(g_adrh * g_aeat) / sum(g_aeat^2)]
growths <- sapply(c(rho, rho_last3, rho_excl, rho_orig, 1), cum)
bt <- as.data.table(read_fst("data-raw/nowcast_backtest.fst"))
target <- series[year == TARGET_YEAR]

mac("NowcastFirstYear", as.character(NOWCAST$first_year))
mac("NowcastLastYear", as.character(NOWCAST$last_year))
mac("NowcastRho", num(rho, 2))
mac("NowcastMidYear", as.character(BASE_YEAR + 1))
mac("NowcastGrowthMid", num(100 * ahead[year == BASE_YEAR + 1, g_nowcast], 1))
mac("NowcastGrowthTarget", num(100 * ahead[year == TARGET_YEAR, g_nowcast], 1))
mac("NowcastGrowth", num(100 * NOWCAST$growth, 1))
mac("AeatNetTarget", num(100 * target$g_aeat, 1))
mac("AeatGrossTarget", num(100 * target$g_aeat_gross, 1))
mac("RhoLastThree", num(rho_last3, 2))
mac("RhoExclCovid", num(rho_excl, 2))
mac("RhoOrigin", num(rho_orig, 2))
mac("NowcastGrowthMin", num(min(growths), 1))
mac("NowcastGrowthMax", num(max(growths), 1))
mac("NowcastBtN", num(nrow(bt)))
mac("NowcastBtFirst", as.character(min(bt$origin)))
mac("NowcastBtLast", as.character(max(bt$origin)))
mac("NowcastBtMAE", num(100 * mean(abs(bt$error)), 1))
mac("NowcastBtMax", num(100 * max(abs(bt$error)), 1))
mac("NowcastBtOneMAE", num(100 * mean(abs(bt$error_1y)), 1))

#-------------------------------------------------------------
# Variance decomposition (GB2 moments of log income)
#-------------------------------------------------------------
vd <- variance_decomposition(tf)
mac("VdWithin", num(vd$national$within, 1))
mac("VdBetweenTract", num(vd$national$between_tract, 1))
mac("VdBetweenMun", num(vd$national$between_mun, 1))
mac("VdBetweenProv", num(vd$national$between_prov, 1))
mac("VdBetweenCcaa", num(vd$national$between_ccaa, 1))
mac("VdCcaaN", num(nrow(vd$by_ccaa)))
mac("VdCcaaWithin", num(mean(vd$by_ccaa$within)))
mac("VdCcaaTract", num(mean(vd$by_ccaa$between_tract)))
mac("VdCcaaRest", num(mean(vd$by_ccaa$between_mun + vd$by_ccaa$between_prov)))
mac("VdCcaaWithinMin", num(min(vd$by_ccaa$within)))
mac("VdCcaaWithinMax", num(max(vd$by_ccaa$within)))

#-------------------------------------------------------------
# Write tex/numbers.tex
#-------------------------------------------------------------
writeLines(c(
  "% Generated by code/6. note_numbers.r -- do not edit by hand.",
  sprintf("%% ADRH %d cross-section, nowcast to %d; tract GB2 fits.", BASE_YEAR, TARGET_YEAR),
  sprintf("\\newcommand{\\%s}{%s}", names(macros), unlist(macros))
), "tex/numbers.tex")
cat(sprintf("Wrote tex/numbers.tex (%d macros) and output/table_*.tex\n", length(macros)))
print(data.table(macro = names(macros), value = unlist(macros)), nrows = 500)
