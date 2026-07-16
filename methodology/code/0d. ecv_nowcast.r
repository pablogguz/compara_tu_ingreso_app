#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: builds CCAA-level income growth factors to nowcast
#*   the 2023 ADRH equivalised income to 2024, using the growth in
#*   mean equivalised income by CCAA from the Living Conditions
#*   Survey (ECV / EU-SILC).
#*
#* Method: raw ECV CCAA growth in "renta media por unidad de consumo"
#*   (income year 2023 -> 2024), rescaled by a single national constant
#*   so that the ADRH population-income-weighted national growth equals
#*   the ECV national growth exactly ("calibrated"). No shrinkage.
#*
#* Output: data-raw/ccaa_growth.fst -- one row per province with the
#*   growth factor to apply to every tract/municipality in that province.
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

# Income reference years: survey year N of the ECV refers to income of N-1.
#   survey 2024 -> income 2023 ; survey 2025 -> income 2024.
BASE_INCOME_YEAR <- 2023   # ADRH income year we start from
TARGET_INCOME_YEAR <- 2024 # income year we nowcast to
BASE_SURVEY   <- BASE_INCOME_YEAR + 1
TARGET_SURVEY <- TARGET_INCOME_YEAR + 1

#-------------------------------------------------------------
# 1. ECV mean equivalised income by CCAA (table 9947)
#-------------------------------------------------------------
print("Downloading ECV income by CCAA (table 9947)...")

ecv <- as.data.table(
  get_data_table(idTable = 9947, nlast = 3, unnest = TRUE, tip = "A")
)

# concept: "Renta media por unidad de consumo", "Total" (no imputed rent)
ecv <- ecv[grepl("Renta media por unidad de consumo. Total", Nombre, fixed = TRUE) &
           !grepl("alquiler", Nombre, fixed = TRUE)]
ecv[, region := trimws(sub("\\. Renta media.*$", "", Nombre))]

ecv_w <- dcast(ecv[Anyo %in% c(BASE_SURVEY, TARGET_SURVEY)],
               region ~ Anyo, value.var = "Valor")
setnames(ecv_w, as.character(c(BASE_SURVEY, TARGET_SURVEY)), c("inc_base", "inc_target"))
ecv_w[, raw_factor := inc_target / inc_base]

# ECV region name -> CCAA code (INE 2-digit)
name2ccaa <- c(
  "Andalucía" = "01", "Aragón" = "02", "Asturias, Principado de" = "03",
  "Balears, Illes" = "04", "Canarias" = "05", "Cantabria" = "06",
  "Castilla y León" = "07", "Castilla - La Mancha" = "08", "Cataluña" = "09",
  "Comunitat Valenciana" = "10", "Extremadura" = "11", "Galicia" = "12",
  "Madrid, Comunidad de" = "13", "Murcia, Región de" = "14",
  "Navarra, Comunidad Foral de" = "15", "País Vasco" = "16", "Rioja, La" = "17",
  "Ceuta" = "18", "Melilla" = "19"
)
ecv_w[, ccaa_code := name2ccaa[region]]

nat_factor <- ecv_w[region == "Total Nacional", raw_factor]
ccaa <- ecv_w[!is.na(ccaa_code), .(ccaa_code, ccaa_name = region, inc_base, inc_target, raw_factor)]

stopifnot(nrow(ccaa) == 19)

#-------------------------------------------------------------
# 2. Province -> CCAA crosswalk (INE 2-digit province codes)
#-------------------------------------------------------------
prov2ccaa <- c(
  "01"="16","02"="08","03"="10","04"="01","05"="07","06"="11","07"="04",
  "08"="09","09"="07","10"="11","11"="01","12"="10","13"="08","14"="01",
  "15"="12","16"="08","17"="09","18"="01","19"="08","20"="16","21"="01",
  "22"="02","23"="01","24"="07","25"="09","26"="17","27"="12","28"="13",
  "29"="01","30"="14","31"="15","32"="12","33"="03","34"="07","35"="05",
  "36"="12","37"="07","38"="05","39"="06","40"="07","41"="01","42"="07",
  "43"="09","44"="02","45"="08","46"="10","47"="07","48"="16","49"="07",
  "50"="02","51"="18","52"="19"
)

#-------------------------------------------------------------
# 3. ADRH income shares by CCAA (for the national calibration)
#    National mean grows by the income-weighted average of the factors,
#    with weights = total equivalised income by CCAA.
#-------------------------------------------------------------
print("Loading ADRH municipal income/population for calibration weights...")

atlas <- merge(
  as.data.table(ineAtlas::get_atlas("income", "municipality")),
  as.data.table(ineAtlas::get_atlas("demographics", "municipality"))
)[year == BASE_INCOME_YEAR]
atlas[, ccaa_code := prov2ccaa[prov_code]]
atlas <- atlas[!is.na(net_income_equiv) & !is.na(population) & population > 0]

ccaa_income <- atlas[, .(income_share_num = sum(population * net_income_equiv)),
                     by = ccaa_code]
ccaa <- merge(ccaa, ccaa_income, by = "ccaa_code")
ccaa[, s_inc := income_share_num / sum(income_share_num)]

# Calibration constant so income-weighted national growth == ECV national
k <- nat_factor / ccaa[, sum(s_inc * raw_factor)]
ccaa[, factor := raw_factor * k]

achieved_nat <- ccaa[, sum(s_inc * factor)]

#-------------------------------------------------------------
# 4. Report
#-------------------------------------------------------------
report <- copy(ccaa)[order(-raw_factor)]
report[, `:=`(raw_pct = round(100 * (raw_factor - 1), 2),
              final_pct = round(100 * (factor - 1), 2))]
cat("\nECV national growth (target):", round(100 * (nat_factor - 1), 3), "%\n")
cat("Calibration constant k       :", round(k, 6), "\n")
cat("Achieved national growth     :", round(100 * (achieved_nat - 1), 3),
    "% (should equal target)\n\n")
print(report[, .(ccaa_code, ccaa_name, raw_pct, final_pct)], row.names = FALSE)

#-------------------------------------------------------------
# 5. Save province-level lookup (one factor per province)
#-------------------------------------------------------------
prov_factors <- data.table(
  prov_code = names(prov2ccaa),
  ccaa_code = unname(prov2ccaa)
)
prov_factors <- merge(prov_factors,
                      ccaa[, .(ccaa_code, ccaa_name, raw_factor, factor)],
                      by = "ccaa_code", all.x = TRUE)
setcolorder(prov_factors, c("prov_code", "ccaa_code", "ccaa_name",
                            "raw_factor", "factor"))
setorder(prov_factors, prov_code)

# Metadata attributes (documented in the file for downstream scripts)
attr(prov_factors, "base_income_year")   <- BASE_INCOME_YEAR
attr(prov_factors, "target_income_year") <- TARGET_INCOME_YEAR
attr(prov_factors, "national_factor")    <- nat_factor

write_fst(prov_factors, "data-raw/ccaa_growth.fst")
cat("\nSaved data-raw/ccaa_growth.fst (", nrow(prov_factors), "provinces )\n")
