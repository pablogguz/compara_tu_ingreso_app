#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: shared helpers for the methodology note, sourced by
#*   5. note_figures.r and 6. note_numbers.r (not run on its own).
#*   Everything refers to the ADRH base year in data-raw/nowcast_factor.fst
#*   and to the tract fits of 1b. fit_gb2.r (base-year euros).
#-------------------------------------------------------------

suppressPackageStartupMessages({
  library(data.table)
  library(fst)
  library(ineAtlas)
  library(matrixStats)
})
source("code/gb2_engine.r")

NOWCAST     <- as.data.table(read_fst("data-raw/nowcast_factor.fst"))
BASE_YEAR   <- NOWCAST$base_income_year
TARGET_YEAR <- NOWCAST$target_income_year
FACTOR      <- NOWCAST$factor
FIT_INFO    <- as.data.table(read_fst("data/gb2_fit_info.fst"))
gb2_setup(FIT_INFO$nat_median)
CORES <- max(1L, min(10L, parallel::detectCores()))

# ADRH tract cross-section: income, demographics, Gini and P80/P20
adrh_tracts <- function(yr = BASE_YEAR) {
  inc <- setDT(get_atlas("income", "tract"))[year == yr]
  dem <- setDT(get_atlas("demographics", "tract"))[year == yr]
  gp  <- setDT(get_atlas("gini_p80p20", "tract"))[year == yr, .(tract_code, gini, p80p20)]
  a <- merge(inc, dem[, !c("mun_code", "mun_name", "prov_code", "prov_name", "district_code", "year")],
             by = "tract_code")
  merge(a, gp, by = "tract_code")
}

# Tract distributions (base-year euros): GB2 fits and log-normal fallback
tract_fits <- function() as.data.table(read_fst("data/tract_fits.fst"))

# Tracts with a GB2 fit, their published core indicators and the fitted ones
# (in sample: the fit targets these indicators).
validation_tracts <- function(tf, a) {
  v <- merge(tf[dist == "gb2"],
             a[, .(tract_code, obs_median = median_income_equiv, obs_mean = net_income_equiv,
                   obs_gini = gini, obs_p80p20 = p80p20)], by = "tract_code")
  v <- v[!is.na(obs_median) & !is.na(obs_mean) & !is.na(obs_gini) & !is.na(obs_p80p20)]
  v[, `:=`(log_ratio_obs = log(obs_mean / obs_median), log_ratio_fit = log(fit_mean / fit_median))]
  v
}

# Population-weighted least squares y = a + b x
wls <- function(y, x, w) {
  m <- lm(y ~ x, weights = w)
  list(intercept = unname(coef(m)[1]), slope = unname(coef(m)[2]), r2 = summary(m)$r.squared)
}

wvar <- function(x, w) { m <- weighted.mean(x, w); sum(w * (x - m)^2) / sum(w) }

CCAA <- data.table(
  prov_code = c("01","20","48","02","13","16","19","45","28","03","12","46",
                "04","11","14","18","21","23","29","41","05","09","24","34","37","40","42","47","49",
                "06","10","07","08","17","25","43","15","27","32","36","22","44","50","26","30","31",
                "33","35","38","39","51","52"),
  ccaa = c(rep("Basque Country", 3), rep("Castile-La Mancha", 5), "Madrid",
           rep("Valencian Community", 3), rep("Andalusia", 8), rep("Castile and Leon", 9),
           rep("Extremadura", 2), "Balearic Islands", rep("Catalonia", 4), rep("Galicia", 4),
           rep("Aragon", 3), "La Rioja", "Murcia", "Navarre", "Asturias",
           rep("Canary Islands", 2), "Cantabria", rep("Ceuta and Melilla", 2))
)

# Hierarchical decomposition of the variance of log income, in per cent of the
# total: within tracts, and between tracts, municipalities, provinces and (for the
# national decomposition) autonomous communities. For a GB2 tract, the mean and
# variance of log income are nu = log b + (digamma(p) - digamma(q)) / a and
# (trigamma(p) + trigamma(q)) / a^2. Tracts with a GB2 fit.
variance_decomposition <- function(tf) {
  d <- tf[dist == "gb2" & population > 0]
  d[, `:=`(nu = lb + (digamma(p) - digamma(q)) / a, s2 = (trigamma(p) + trigamma(q)) / a^2)]
  d <- merge(d, CCAA, by = "prov_code")
  d[, mun_mean := weighted.mean(nu, population), by = mun_code]
  d[, prov_mean := weighted.mean(nu, population), by = prov_code]
  d[, ccaa_mean := weighted.mean(nu, population), by = ccaa]
  shares <- function(x, national) {
    within <- x[, weighted.mean(s2, population)]
    between <- x[, wvar(nu, population)]
    total <- within + between
    out <- data.table(
      within        = within,
      between_tract = between - x[, wvar(mun_mean, population)],
      between_mun   = x[, wvar(mun_mean, population) - wvar(prov_mean, population)]
    )
    if (national) {
      out[, between_prov := x[, wvar(prov_mean, population) - wvar(ccaa_mean, population)]]
      out[, between_ccaa := x[, wvar(ccaa_mean, population)]]
    } else {
      out[, between_prov := x[, wvar(prov_mean, population)]]
    }
    out[, lapply(.SD, function(v) 100 * v / total)]
  }
  list(
    national = shares(d, TRUE),
    by_ccaa  = d[ccaa != "Ceuta and Melilla", shares(.SD, FALSE), by = ccaa]
  )
}

# Tract means of income (GB2 truncated at the income cap, as in the fit; log-normal otherwise)
tract_means <- function(d) {
  m <- rep(NA_real_, nrow(d)); g <- d$dist == "gb2"
  if (any(g)) m[g] <- FAMILIES$gb2$cmean(list(a = d$a[g], p = d$p[g], q = d$q[g], lb = d$lb[g]))
  if (any(!g)) m[!g] <- exp(d$mu[!g] + d$sigma[!g]^2 / 2)
  m
}

# The published indicators of the population-weighted mixture of the tracts in d:
# median, P20, P80, mean, Gini (after replacing the lowest and highest 1.5% of incomes
# with the nearest remaining value, as the ADRH does) and the nine shares.
mixture_stats <- function(d, w) {
  w <- w / sum(w)
  q <- mixture_quantiles(d, w, probs = c(0.015, 0.2, 0.5, 0.8, 0.985))
  Fx <- function(x) as.vector(crossprod(w, tract_cdf(d, log(x))))
  xs <- exp(seq(log(q[1]), log(q[5]), length.out = 800))
  S <- 1 - Fx(xs)
  trap <- function(y) sum(diff(xs) * (head(y, -1) + tail(y, -1)) / 2)
  Ft <- Fx(THR)
  c(median = q[3], p20 = q[2], p80 = q[4], mean = sum(w * tract_means(d)),
    gini = 100 * (1 - (q[1] + trap(S^2)) / (q[1] + trap(S))),
    setNames(100 * ifelse(IS_ABOVE, 1 - Ft, Ft), SH))
}

group_stats <- function(d, groups) {
  idx <- split(seq_len(nrow(d)), groups)
  res <- parallel::mclapply(idx, function(i) mixture_stats(d[i], d$population[i]), mc.cores = CORES)
  err <- vapply(res, inherits, TRUE, "try-error"); if (any(err)) stop(res[[which(err)[1]]])
  out <- as.data.table(do.call(rbind, res)); out[, code := names(idx)]
  out
}

# Published quantile indicators are 700-euro bin midpoints (outside Navarra): a model
# median is inside the bin when |model - published| <= 350; the model's P80/P20 is
# comparable with the published one after binning P20 and P80 and rounding to 0.1.
in_bin <- function(model, published) ifelse(published %% 350 == 0, abs(model - published) <= 350, NA)
binned_p8020 <- function(p20, p80, published_median) {
  mid <- function(q) 700 * floor(q / 700) + 350
  ifelse(published_median %% 350 == 0, round(mid(p80) / mid(p20), 1), round(p80 / p20, 1))
}
