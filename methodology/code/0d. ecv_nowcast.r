#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: builds the factor that nowcasts ADRH equivalised
#*   income from the latest ADRH year (2023) to 2024.
#*
#* Method: national mean equivalised income, year-on-year growth,
#*   in the ADRH and in the Living Conditions Survey (ECV / EU-SILC).
#*   rho = sum(ADRH growth) / sum(ECV growth) over the years both
#*   cover measures how much the ECV over- or understates growth in
#*   the administrative data; the nowcast is rho * ECV growth for the
#*   target year, applied to every tract and municipality.
#*
#* Output: data-raw/nowcast_factor.fst -- one row with the factor. Its
#*   base_income_year is the ADRH cross-section every later script uses.
#*   data-raw/nowcast_series.fst -- the yearly ADRH and ECV growth
#*   rates behind rho (used by 6. note_numbers.r).
#-------------------------------------------------------------

packages_to_load <- c("tidyverse", "data.table", "ineapir", "ineAtlas", "fst")

package.check <- lapply(
  packages_to_load,
  FUN = function(x) {
    if (!require(x, character.only = TRUE)) {
      install.packages(x, dependencies = TRUE)
    }
  }
)
lapply(packages_to_load, require, character = TRUE)
#-------------------------------------------------------------------

# Income reference years: ECV survey wave N reports income earned in N-1.
BASE_INCOME_YEAR <- 2023   # latest ADRH income year
TARGET_INCOME_YEAR <- 2024 # income year we nowcast to

#-------------------------------------------------------------
# 1. ADRH: national mean equivalised income, year-on-year growth
#    Population-weighted mean across municipalities observed in both
#    years, so changes in ADRH coverage do not register as growth.
#-------------------------------------------------------------
print("Loading ADRH municipal income and population...")

adrh <- merge(
  as.data.table(ineAtlas::get_atlas("income", "municipality"))[, .(mun_code, year, y = net_income_equiv)],
  as.data.table(ineAtlas::get_atlas("demographics", "municipality"))[, .(mun_code, year, pop = population)],
  by = c("mun_code", "year")
)[!is.na(y) & !is.na(pop) & pop > 0]

adrh_years <- sort(unique(adrh$year))
adrh_growth <- rbindlist(lapply(adrh_years[-1], function(t) {
  m <- merge(adrh[year == t - 1], adrh[year == t], by = "mun_code", suffixes = c("_0", "_1"))
  data.table(
    year = t,
    g_adrh = weighted.mean(m$y_1, m$pop_1) / weighted.mean(m$y_0, m$pop_0) - 1
  )
}))

#-------------------------------------------------------------
# 2. ECV: national mean equivalised income (table 9947,
#    "Renta media por unidad de consumo", without imputed rent)
#-------------------------------------------------------------
print("Downloading ECV national income (table 9947)...")

ecv <- as.data.table(
  get_data_table(idTable = 9947, nlast = 25, unnest = TRUE, tip = "A")
)
ecv <- ecv[grepl("Total Nacional. Renta media por unidad de consumo. Total", Nombre, fixed = TRUE) &
           !grepl("alquiler", Nombre, fixed = TRUE)]
stopifnot(uniqueN(ecv$Anyo) == nrow(ecv))

ecv <- ecv[, .(year = Anyo - 1L, ecv = Valor)][order(year)]
ecv[, g_ecv := ecv / shift(ecv) - 1]

#-------------------------------------------------------------
# 3. Ratio of administrative to survey growth, and the nowcast
#-------------------------------------------------------------
both <- merge(adrh_growth, ecv[!is.na(g_ecv)], by = "year")
stopifnot(max(both$year) == BASE_INCOME_YEAR)

rho <- sum(both$g_adrh) / sum(both$g_ecv)
g_ecv_target <- ecv[year == TARGET_INCOME_YEAR, g_ecv]
stopifnot(length(g_ecv_target) == 1)

growth <- rho * g_ecv_target
factor <- 1 + growth

#-------------------------------------------------------------
# 4. Report
#-------------------------------------------------------------
cat("\nNational year-on-year growth (%):\n")
print(both[, .(year, adrh = round(100 * g_adrh, 2), ecv = round(100 * g_ecv, 2))], row.names = FALSE)
cat(sprintf("\nrho = sum(ADRH) / sum(ECV), %d-%d : %.4f\n", min(both$year), max(both$year), rho))
cat(sprintf("ECV growth %d -> %d             : %.2f%%\n", BASE_INCOME_YEAR, TARGET_INCOME_YEAR, 100 * g_ecv_target))
cat(sprintf("Nowcast growth (rho x ECV)        : %.2f%%\n", 100 * growth))

#-------------------------------------------------------------
# 5. Save
#-------------------------------------------------------------
nowcast <- data.table(
  base_income_year = BASE_INCOME_YEAR,
  target_income_year = TARGET_INCOME_YEAR,
  first_year = min(both$year),
  last_year = max(both$year),
  rho = rho,
  ecv_growth = g_ecv_target,
  growth = growth,
  factor = factor
)

write_fst(nowcast, "data-raw/nowcast_factor.fst")
cat("\nSaved data-raw/nowcast_factor.fst\n")

series <- merge(adrh_growth, ecv, by = "year", all = TRUE)[order(year)]
write_fst(as.data.frame(series), "data-raw/nowcast_series.fst")
cat("Saved data-raw/nowcast_series.fst\n")
