
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
#*   born abroad (INE annual population census, tract tables exported
#*   as CSV). Missing values take the provincial population-weighted
#*   mean.
#* Each *_is_imputed flag is set BEFORE any imputation: 1 means the
#* source does not publish the value for that municipality.
#*
#* The census part needs TRACT_TABLES_DIR (the folder with
#* tract_foreign_raw.csv and tract_educ_raw.csv). Without it, the census
#* columns are carried over from the existing base-year file and only the
#* income columns are rebuilt.
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

# Census reference periods in the INE tract tables (the app shows them)
EDUC_PERIOD <- 2023
FOREIGN_PERIOD <- 2024

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

path_tract_tables <- Sys.getenv("TRACT_TABLES_DIR")

if (nzchar(path_tract_tables)) {
    if (!dir.exists(path_tract_tables)) stop("TRACT_TABLES_DIR does not exist: ", path_tract_tables)

    foreign <- fread(file.path(path_tract_tables, "tract_foreign_raw.csv")) %>%
      filter(`Municipios` != "" & `Secciones` == "") %>%
      mutate(
        mun_code = substr(gsub("[^0-9]", "", Municipios), 1, 5),
        pop = gsub("[^0-9]", "", Total)
      ) %>%
      filter(`Periodo` == FOREIGN_PERIOD & Sexo == "Total") %>%
      select(mun_code, pop, `Lugar de nacimiento`) %>%
      filter(`Lugar de nacimiento` != "Total") %>%
      group_by(mun_code) %>%
      mutate(
        pop = as.numeric(pop),
        total_pop = sum(pop),
        pct_foreign_born = 100 * pop / total_pop
      ) %>%
      filter(`Lugar de nacimiento` == "Extranjera") %>%
      select(pct_foreign_born, mun_code) %>%
      ungroup()

    educ <- fread(file.path(path_tract_tables, "tract_educ_raw.csv")) %>%
      filter(`Municipios` != "" & `Secciones` == "") %>%
      mutate(
        mun_code = substr(gsub("[^0-9]", "", Municipios), 1, 5),
        value = as.numeric(gsub("[^0-9]", "", Total))
      ) %>%
      filter(`Periodo` == EDUC_PERIOD, `Sexo` == "Total") %>%
      # "Total" is the population aged 15 and over
      filter(`Nivel de formación alcanzado` %in% c("Total", "Educación superior")) %>%
      pivot_wider(id_cols = mun_code, names_from = `Nivel de formación alcanzado`, values_from = value) %>%
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
} else {
    if (!file.exists(OUT_FILE)) stop("Set TRACT_TABLES_DIR: no base-year file to reuse census columns from")
    message("TRACT_TABLES_DIR not set: census columns carried over from ", OUT_FILE)
    census <- read_fst(OUT_FILE) %>% select(mun_code, all_of(census_cols))
}

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
