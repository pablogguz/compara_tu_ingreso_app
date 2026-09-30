
#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: municipality statistics for the ADRH base year, shown
#*   as context in the app. 3c. apply_nowcast_mun_stats.r then nowcasts
#*   the income column and writes data/municipality_stats.fst.
#*
#* - Equivalised income (ADRH). Where the ADRH does not publish it
#*   (municipalities under 100 residents), it is imputed as income per
#*   person times the provincial, population-weighted ratio of the two
#*   measures -- the rule 1b. fit_gb2.r applies to tracts -- and,
#*   failing that, as the provincial population-weighted mean.
#* - Share of the population aged 15+ with higher education, and share
#*   born abroad (INE annual population census, results by census tract:
#*   tables 66592 and 65031, which also carry municipal totals). Missing
#*   values take the provincial population-weighted mean.
#* Each *_is_imputed flag is set BEFORE any imputation: 1 means the
#* source does not publish the value for that municipality.
#*
#* The census tables are large (0.2-0.35 GB each): the municipal rows of
#* the periods used are kept in data-raw/census_<table>_<period>.csv, and
#* the tables are only downloaded when that file is missing or when
#* CENSUS_REFRESH=1.
#-------------------------------------------------------------

packages_to_load <- c("tidyverse", "data.table", "ineAtlas", "fst")

package.check <- lapply(
  packages_to_load,
  FUN = function(x) {
    if (!require(x, character.only = TRUE)) {
      install.packages(x, dependencies = TRUE)
    }
  }
)
lapply(packages_to_load, require, character.only = TRUE)

#-------------------------------------------------------------------

BASE_YEAR <- read_fst("data-raw/nowcast_factor.fst")$base_income_year
OUT_FILE <- sprintf("data-raw/municipality_stats_%d.fst", BASE_YEAR)

# Census reference periods (1 January), the latest in each table. The app
# shows them: keep src/lib/years.ts in step (tests/years.test.ts checks).
EDUC_PERIOD <- 2024      # table 66592, education of the population aged 15+
FOREIGN_PERIOD <- 2025   # table 65031, place of birth (Spain / abroad)

# ------------------------------ Atlas ----------------------------- #
atlas_income <- merge(
    setDT(ineAtlas::get_atlas("income", "municipality")),
    setDT(ineAtlas::get_atlas("demographics", "municipality"))
) %>%
    filter(year == BASE_YEAR) %>%
    select(mun_code, prov_code, net_income_equiv, net_income_pc, population)

income <- atlas_income %>%
    mutate(net_income_equiv_is_imputed = as.integer(is.na(net_income_equiv))) %>%
    group_by(prov_code) %>%
    mutate(
        ratio = weighted.mean(net_income_equiv / net_income_pc, w = population, na.rm = TRUE),
        net_income_equiv = if_else(is.na(net_income_equiv), net_income_pc * ratio, net_income_equiv),
        net_income_equiv = if_else(is.na(net_income_equiv),
                                   weighted.mean(net_income_equiv, population, na.rm = TRUE),
                                   net_income_equiv)
    ) %>%
    ungroup() %>%
    select(mun_code, prov_code, population, net_income_equiv, net_income_equiv_is_imputed)

# ---------------------------- Census ------------------------------- #
census_cols <- c("pct_foreign_born", "pct_higher_ed_completed",
                 "pct_foreign_born_is_imputed", "pct_higher_ed_completed_is_imputed")

# Municipal totals (Sexo == "Total") of one census table for one period,
# cached as a small CSV; the full table is downloaded only when needed.
census_municipal <- function(table, period, category) {
    cache <- sprintf("data-raw/census_%d_%d.csv", table, period)
    if (!file.exists(cache) || Sys.getenv("CENSUS_REFRESH") == "1") {
        message("Downloading INE census table ", table, " (large)...")
        raw <- tempfile(fileext = ".csv")
        options(timeout = max(1800, getOption("timeout")))
        download.file(sprintf("https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/%d.csv", table),
                      raw, mode = "wb", quiet = TRUE)
        x <- fread(raw, sep = ";", encoding = "UTF-8", colClasses = "character")
        unlink(raw)
        stopifnot(as.character(period) %in% x$Periodo)
        x <- x[Municipios != "" & Secciones == "" & Sexo == "Total" & Periodo == as.character(period)]
        fwrite(x[, c("Municipios", category, "Total"), with = FALSE], cache)
    }
    x <- fread(cache, colClasses = "character", encoding = "UTF-8")
    x[, `:=`(mun_code = substr(gsub("[^0-9]", "", Municipios), 1, 5),
             value = suppressWarnings(as.numeric(gsub("[^0-9]", "", Total))))]
    x[]
}

foreign <- census_municipal(65031, FOREIGN_PERIOD, "Lugar de nacimiento") %>%
    select(mun_code, place = `Lugar de nacimiento`, value) %>%
    pivot_wider(id_cols = mun_code, names_from = place, values_from = value) %>%
    mutate(pct_foreign_born = 100 * Extranjero / Total) %>%
    select(mun_code, pct_foreign_born)

educ <- census_municipal(66592, EDUC_PERIOD, "Nivel de formación alcanzado") %>%
    # "Total" is the population aged 15 and over
    filter(`Nivel de formación alcanzado` %in% c("Total", "Educación superior")) %>%
    select(mun_code, level = `Nivel de formación alcanzado`, value) %>%
    pivot_wider(id_cols = mun_code, names_from = level, values_from = value) %>%
    mutate(pct_higher_ed_completed = 100 * `Educación superior` / Total) %>%
    select(mun_code, pct_higher_ed_completed)

census <- income %>%
    select(mun_code, prov_code, population) %>%
    left_join(foreign, by = "mun_code") %>%
    left_join(educ, by = "mun_code") %>%
    mutate(across(c(pct_foreign_born, pct_higher_ed_completed),
                  list(is_imputed = ~ as.integer(is.na(.))))) %>%
    group_by(prov_code) %>%
    mutate(across(c(pct_foreign_born, pct_higher_ed_completed),
                  ~ ifelse(is.na(.), weighted.mean(., population, na.rm = TRUE), .))) %>%
    ungroup() %>%
    select(mun_code, all_of(census_cols))

# ------------------------------ Combine ----------------------------- #
municipality_stats <- income %>%
    left_join(census, by = "mun_code") %>%
    select(
        mun_code, prov_code,
        net_income_equiv, pct_foreign_born, pct_higher_ed_completed,
        net_income_equiv_is_imputed, pct_foreign_born_is_imputed,
        pct_higher_ed_completed_is_imputed
    )

cat("Municipalities:", nrow(municipality_stats), "\n")
cat("Imputed (source does not publish the value):\n")
print(colSums(municipality_stats[, grep("_is_imputed$", names(municipality_stats))], na.rm = TRUE))

write_fst(municipality_stats, OUT_FILE)
cat("Saved", OUT_FILE, "\n")
