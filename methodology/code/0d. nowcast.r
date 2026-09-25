#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: builds the factor that nowcasts ADRH equivalised
#*   income from the latest ADRH year (2023) to 2025.
#*
#* Method: national growth of household income per person in the tax
#*   data of the Agencia Tributaria (AEAT), the source the ADRH itself is
#*   built from. The AEAT's annual tax revenue report (Informe Anual de
#*   Recaudacion Tributaria, table 2.1) publishes gross household income
#*   from withholdings and income tax returns about six months after the
#*   year ends, against almost two years for the ADRH. The indicator is
#*   gross household income excluding capital gains, net of the income
#*   tax accrued, divided by population.
#*   rho = sum(ADRH growth) / sum(AEAT growth) over the years both cover
#*   corrects for the difference in concept (income per consumption unit,
#*   net of social contributions, in the ADRH); the nowcast for each year
#*   after the ADRH is rho * AEAT growth, chained to the target year and
#*   applied to every tract and municipality.
#*
#* Validation: a pseudo-real-time backtest. At each origin B, rho is
#*   estimated with the ADRH up to B only, and the ADRH level in
#*   B + h (h = target - base) is predicted from AEAT growth.
#*
#* Output: data-raw/nowcast_factor.fst -- one row with the factor. Its
#*   base_income_year is the ADRH cross-section every later script uses.
#*   data-raw/nowcast_series.fst -- the yearly ADRH and AEAT growth
#*   rates behind rho, and the nowcast growth per year.
#*   data-raw/nowcast_backtest.fst -- the backtest errors.
#*   data-raw/aeat_rentas_hogares_<target>.xlsx -- the AEAT table used.
#-------------------------------------------------------------

packages_to_load <- c("tidyverse", "data.table", "ineAtlas", "fst", "readxl", "jsonlite")

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

BASE_INCOME_YEAR <- 2023   # latest ADRH income year
TARGET_INCOME_YEAR <- 2025 # income year we nowcast to: the latest AEAT annual report

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
stopifnot(max(adrh_years) == BASE_INCOME_YEAR)
adrh_growth <- rbindlist(lapply(adrh_years[-1], function(t) {
  m <- merge(adrh[year == t - 1], adrh[year == t], by = "mun_code", suffixes = c("_0", "_1"))
  data.table(
    year = t,
    g_adrh = weighted.mean(m$y_1, m$pop_1) / weighted.mean(m$y_0, m$pop_0) - 1
  )
}))

#-------------------------------------------------------------
# 2. AEAT: household income from tax sources (Informe Anual de
#    Recaudacion Tributaria, cuadro 2.1 "Rentas de los hogares e IRPF",
#    millions of euros; the latest two years are provisional)
#-------------------------------------------------------------
aeat_file <- sprintf("data-raw/aeat_rentas_hogares_%d.xlsx", TARGET_INCOME_YEAR)
if (!file.exists(aeat_file)) {
  print("Downloading AEAT table 2.1...")
  download.file(sprintf(paste0(
    "https://sede.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/",
    "Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_%d/Cuadro_2.1_es_es.xlsx"), TARGET_INCOME_YEAR),
    aeat_file, mode = "wb", quiet = TRUE)
}

raw <- suppressMessages(read_excel(aeat_file, col_names = FALSE, .name_repair = "minimal"))
raw <- as.data.frame(raw)
row_text <- function(i) vapply(raw, function(col) trimws(as.character(col[i])), "")
is_year <- function(x) !is.na(x) & grepl("^(19|20)[0-9]{2}", x)
header <- which(vapply(seq_len(nrow(raw)), function(i) sum(is_year(row_text(i))) > 20, logical(1)))[1]
year_cols <- which(is_year(row_text(header)))
label_col <- which(vapply(raw, function(col) any(trimws(col) == "Rentas brutas de los hogares", na.rm = TRUE), logical(1)))[1]
label <- trimws(as.character(raw[[label_col]]))

aeat_row <- function(name) {
  i <- which(label == name)[1]
  stopifnot(!is.na(i))
  as.numeric(unlist(raw[i, year_cols]))
}
aeat <- data.table(
  year = as.integer(substr(row_text(header)[year_cols], 1, 4)),
  gross = aeat_row("Rentas brutas de los hogares"),
  capital_gains = aeat_row("Ganancias patrimoniales"),
  income_tax = aeat_row("IRPF devengado (D)")
)
stopifnot(max(aeat$year) == TARGET_INCOME_YEAR, !anyNA(aeat))

#-------------------------------------------------------------
# 3. Population (national accounts concept, Eurostat nama_10_pe)
#-------------------------------------------------------------
print("Downloading population (Eurostat nama_10_pe)...")
pop_json <- fromJSON(paste0(
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_pe",
  "?geo=ES&na_item=POP_NC&unit=THS_PER&sinceTimePeriod=2006"))
time_index <- unlist(pop_json$dimension$time$category$index)
population <- data.table(
  year = as.integer(names(time_index)),
  pop = unlist(pop_json$value)[as.character(time_index)]
)
stopifnot(TARGET_INCOME_YEAR %in% population$year)

aeat <- merge(aeat, population, by = "year")[order(year)]
aeat[, `:=`(
  net_pc = (gross - capital_gains - income_tax) / pop,
  gross_pc = (gross - capital_gains) / pop
)]
aeat[, `:=`(g_aeat = net_pc / shift(net_pc) - 1, g_aeat_gross = gross_pc / shift(gross_pc) - 1)]

#-------------------------------------------------------------
# 4. Ratio of ADRH to AEAT growth, and the nowcast
#-------------------------------------------------------------
both <- merge(adrh_growth, aeat[, .(year, g_aeat)], by = "year")
stopifnot(max(both$year) == BASE_INCOME_YEAR)

rho <- sum(both$g_adrh) / sum(both$g_aeat)
ahead <- aeat[year > BASE_INCOME_YEAR & year <= TARGET_INCOME_YEAR, .(year, g_aeat)]
stopifnot(nrow(ahead) == TARGET_INCOME_YEAR - BASE_INCOME_YEAR)
ahead[, g_nowcast := rho * g_aeat]

factor <- prod(1 + ahead$g_nowcast)
growth <- factor - 1

#-------------------------------------------------------------
# 5. Pseudo-real-time backtest: at each origin B, estimate rho with the
#    ADRH up to B and predict the ADRH level h years later
#-------------------------------------------------------------
h <- TARGET_INCOME_YEAR - BASE_INCOME_YEAR
adrh_level <- adrh_growth[, .(year, g_adrh)]
backtest <- rbindlist(lapply(both$year, function(B) {
  known <- both[year <= B]
  if (nrow(known) < 2 || B + h > BASE_INCOME_YEAR) return(NULL)
  r <- sum(known$g_adrh) / sum(known$g_aeat)
  target <- both[year > B & year <= B + h]
  data.table(
    origin = B,
    horizon = h,
    predicted = prod(1 + r * target$g_aeat) - 1,
    observed = prod(1 + target$g_adrh) - 1,
    predicted_1y = r * target$g_aeat[1],
    observed_1y = target$g_adrh[1]
  )
}))
backtest[, `:=`(error = predicted - observed, error_1y = predicted_1y - observed_1y)]

#-------------------------------------------------------------
# 6. Report
#-------------------------------------------------------------
cat("\nNational year-on-year growth (%):\n")
print(merge(adrh_growth, aeat[, .(year, g_aeat, g_aeat_gross)], by = "year", all = TRUE)[year >= 2016,
  .(year, adrh = round(100 * g_adrh, 2), aeat_net = round(100 * g_aeat, 2), aeat_gross = round(100 * g_aeat_gross, 2))],
  row.names = FALSE)
cat(sprintf("\nrho = sum(ADRH) / sum(AEAT), %d-%d : %.4f\n", min(both$year), max(both$year), rho))
for (i in seq_len(nrow(ahead))) {
  cat(sprintf("Nowcast growth %d (rho x %.2f%%)     : %.2f%%\n", ahead$year[i], 100 * ahead$g_aeat[i], 100 * ahead$g_nowcast[i]))
}
cat(sprintf("Factor %d -> %d                     : %.4f\n", BASE_INCOME_YEAR, TARGET_INCOME_YEAR, factor))
cat(sprintf("\nBacktest, %d-year horizon, origins %d-%d: mean abs error %.2f pp, max %.2f pp\n",
            h, min(backtest$origin), max(backtest$origin),
            100 * mean(abs(backtest$error)), 100 * max(abs(backtest$error))))
print(backtest[, .(origin, predicted = round(100 * predicted, 2), observed = round(100 * observed, 2),
                   error = round(100 * error, 2))], row.names = FALSE)

#-------------------------------------------------------------
# 7. Save
#-------------------------------------------------------------
nowcast <- data.table(
  base_income_year = BASE_INCOME_YEAR,
  target_income_year = TARGET_INCOME_YEAR,
  first_year = min(both$year),
  last_year = max(both$year),
  rho = rho,
  growth = growth,
  factor = factor
)

write_fst(nowcast, "data-raw/nowcast_factor.fst")
cat("\nSaved data-raw/nowcast_factor.fst\n")

series <- merge(adrh_growth, aeat[, .(year, g_aeat, g_aeat_gross)], by = "year", all = TRUE)
series <- merge(series, ahead[, .(year, g_nowcast)], by = "year", all = TRUE)[order(year)]
write_fst(as.data.frame(series), "data-raw/nowcast_series.fst")
write_fst(as.data.frame(backtest), "data-raw/nowcast_backtest.fst")
cat("Saved data-raw/nowcast_series.fst and data-raw/nowcast_backtest.fst\n")
