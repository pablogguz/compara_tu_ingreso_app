#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: applies the ECV CCAA nowcast (2023 -> 2024) to the
#*   equivalised income column of municipality_stats.fst.
#*
#* WHY THIS EXISTS: 3a. mun_stats.r is already nowcast-aware, but it
#*   depends on local wikibarrio CSVs (foreign-born, education) that are
#*   not available on every machine. This convenience step regenerates
#*   the shipped municipality_stats.fst by scaling ONLY net_income_equiv
#*   (the sole income-derived field); the demographic columns are
#*   untouched. Run it EXACTLY ONCE on the pre-nowcast (2023) file.
#*   Do NOT run it after a full re-run of the nowcast-aware 3a.
#-------------------------------------------------------------

packages_to_load <- c("tidyverse", "fst")
lapply(packages_to_load, require, character.only = TRUE)
#-------------------------------------------------------------------

ccaa_growth <- read_fst("data-raw/ccaa_growth.fst") %>%
    select(prov_code, nowcast_factor = factor)

mun <- read_fst("data/municipality_stats.fst")

stopifnot("net_income_equiv" %in% names(mun), "prov_code" %in% names(mun))

before_mean <- mean(mun$net_income_equiv, na.rm = TRUE)

mun_nowcast <- mun %>%
    left_join(ccaa_growth, by = "prov_code") %>%
    mutate(
        nowcast_factor = coalesce(nowcast_factor, 1),
        net_income_equiv = net_income_equiv * nowcast_factor
    ) %>%
    select(-nowcast_factor)

after_mean <- mean(mun_nowcast$net_income_equiv, na.rm = TRUE)

cat(sprintf("Municipalities: %d\n", nrow(mun_nowcast)))
cat(sprintf("Mean net_income_equiv: %.0f -> %.0f (%+.2f%%)\n",
            before_mean, after_mean, 100 * (after_mean / before_mean - 1)))

# sanity: column set unchanged
stopifnot(identical(sort(names(mun)), sort(names(mun_nowcast))))

write_fst(mun_nowcast, "data/municipality_stats.fst")
cat("Saved data/municipality_stats.fst\n")
