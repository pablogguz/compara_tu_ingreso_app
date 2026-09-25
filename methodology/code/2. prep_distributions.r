
#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: prepares the data for the app. Each tract's income
#*  distribution is its fitted GB2 (1b. fit_gb2.r) or, for tracts without
#*  core indicators, the log-normal fallback; national, provincial and
#*  municipal distributions are population-weighted mixtures of them,
#*  nowcast to the target year.
#*
#* Output (same files and columns as the app expects):
#*   data/national_percentiles.fst, data/provincial_percentiles.fst,
#*   data/mun_percentiles.fst, data/municipality_lookup.fst,
#*   data/density_curve.fst, data/density_curve_prov.fst,
#*   data/density_curve_mun/mun_<prov>.fst, and data/tract_params.fst
#-------------------------------------------------------------

packages_to_load <- c("data.table", "fst", "Matrix", "matrixStats")
invisible(lapply(packages_to_load, function(p) {
  if (!require(p, character.only = TRUE)) install.packages(p, dependencies = TRUE)
  suppressPackageStartupMessages(require(p, character.only = TRUE))
}))
source("code/gb2_engine.r")
CORES <- max(1L, min(10L, parallel::detectCores()))

#-------------------------------------------------------------
# 1. Tract distributions, nowcast
#-------------------------------------------------------------
# Multiplying every income by the nowcast factor k scales each GB2 (b -> k b) and
# shifts each fallback log-normal (mu -> mu + log k); shapes and Ginis are unchanged.
nowcast_factor <- read_fst("data-raw/nowcast_factor.fst")$factor
stopifnot(length(nowcast_factor) == 1, is.finite(nowcast_factor))

d <- as.data.table(read_fst("data/tract_fits.fst"))
setorder(d, tract_code)
d[, `:=`(lb = lb + log(nowcast_factor), mu = mu + log(nowcast_factor))]
d[, weight := population / sum(population)]
cat(sprintf("Tracts: %d (GB2 %d, log-normal fallback %d)\n", nrow(d), sum(d$dist == "gb2"), sum(d$dist != "gb2")))

write_fst(d, "data/tract_params.fst")

#-------------------------------------------------------------
# 2. Density curves (closed-form GB2 and log-normal densities)
#-------------------------------------------------------------
x_grid <- seq(0, 160000, length.out = 1000)
D <- cbind(0, tract_pdf(d, x_grid[-1]))                       # density at x = 0 set to 0

group_density <- function(groups) {
  g <- factor(groups)
  W <- sparseMatrix(i = as.integer(g), j = seq_len(nrow(d)), x = d$population, dims = c(nlevels(g), nrow(d)))
  W <- Diagonal(x = 1 / rowSums(W)) %*% W
  list(codes = levels(g), y = as.matrix(W %*% D))
}

print("Calculating national income density curve...")
nat_d <- group_density(rep("ES", nrow(d)))
write_fst(data.frame(x = x_grid, y = nat_d$y[1, ]), "data/density_curve.fst")

print("Calculating provincial density curves...")
prov_d <- group_density(d$prov_code)
write_fst(data.frame(prov_code = rep(prov_d$codes, each = length(x_grid)), x = rep(x_grid, length(prov_d$codes)),
                     y = as.vector(t(prov_d$y))), "data/density_curve_prov.fst")

print("Calculating municipal density curves...")
mun_d <- group_density(d$mun_code)
mun_prov <- unique(d[, .(mun_code, prov_code)])[match(mun_d$codes, mun_code), prov_code]
dir.create("data/density_curve_mun", showWarnings = FALSE)
for (p in sort(unique(mun_prov))) {
  i <- which(mun_prov == p)
  write_fst(data.frame(mun_code = rep(mun_d$codes[i], each = length(x_grid)), x = rep(x_grid, length(i)),
                       y = as.vector(t(mun_d$y[i, , drop = FALSE]))),
            paste0("data/density_curve_mun/mun_", p, ".fst"))
}
rm(D)

#-------------------------------------------------------------
# 3. Percentiles of the mixtures (Brent's method, bracketed on a log grid)
#-------------------------------------------------------------
group_percentiles <- function(groups) {
  idx <- split(seq_len(nrow(d)), groups)
  res <- parallel::mclapply(idx, function(i) mixture_quantiles(d[i], d$population[i]), mc.cores = CORES)
  err <- vapply(res, inherits, TRUE, "try-error"); if (any(err)) stop(res[[which(err)[1]]])
  out <- data.table(percentile = paste0("p", 1:99))
  out[, (names(idx)) := res]
  out
}

print("Calculating national-level percentiles...")
national_percentiles <- data.frame(percentile = 1:99, value = mixture_quantiles(d, d$population))

print("Calculating provincial-level percentiles...")
provincial_percentiles <- group_percentiles(d$prov_code)

print("Calculating municipality-level percentiles...")
mun_percentiles <- group_percentiles(d$mun_code)

#-------------------------------------------------------------
# 4. Municipality lookup: municipalities with an estimated distribution
#-------------------------------------------------------------
municipality_lookup <- unique(d[, .(mun_code, mun_name, prov_code, prov_name)])
municipality_lookup[prov_name == "Avila", prov_name := "Ávila"]

#-------------------------------------------------------------
# 5. Save and check
#-------------------------------------------------------------
write_fst(national_percentiles, "data/national_percentiles.fst")
write_fst(as.data.frame(provincial_percentiles), "data/provincial_percentiles.fst")
write_fst(as.data.frame(mun_percentiles), "data/mun_percentiles.fst")
write_fst(as.data.frame(municipality_lookup), "data/municipality_lookup.fst")

inc <- function(v) all(diff(v) > 0)
stopifnot(
  inc(national_percentiles$value),
  all(vapply(provincial_percentiles[, -1], inc, TRUE)),
  all(vapply(mun_percentiles[, -1], inc, TRUE)),
  setequal(municipality_lookup$mun_code, setdiff(names(mun_percentiles), "percentile"))
)
Fnat <- function(x) sum(d$weight * tract_cdf(d, log(x)))
cat(sprintf("Max |F(q_p) - p| (Spain): %.2e\n", max(abs(sapply(national_percentiles$value, Fnat) - (1:99) / 100))))
cat(sprintf("Provinces: %d | municipalities: %d\n", ncol(provincial_percentiles) - 1, nrow(municipality_lookup)))
cat("Spain P10/P50/P90 (nowcast):", round(national_percentiles$value[c(10, 50, 90)]), "\n")
