#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: nowcasts the municipality statistics from the ADRH
#*   base year to the target year by scaling equivalised income with the
#*   national factor from 0d. nowcast.r. The census columns and the
#*   *_is_imputed flags are left as they are.
#*
#* Input : data-raw/municipality_stats_<base year>.fst (3a. mun_stats.r)
#*         data-raw/nowcast_factor.fst                (0d. nowcast.r)
#* Output: data/municipality_stats.fst
#-------------------------------------------------------------

packages_to_load <- c("tidyverse", "fst")
lapply(packages_to_load, require, character.only = TRUE)
#-------------------------------------------------------------------

nowcast <- read_fst("data-raw/nowcast_factor.fst")
nowcast_factor <- nowcast$factor
stopifnot(length(nowcast_factor) == 1, is.finite(nowcast_factor))

mun <- read_fst(sprintf("data-raw/municipality_stats_%d.fst", nowcast$base_income_year))
stopifnot("net_income_equiv" %in% names(mun),
          all(mun$net_income_equiv_is_imputed %in% 0:1))

mun_nowcast <- mun %>%
    mutate(net_income_equiv = net_income_equiv * nowcast_factor)

cat(sprintf("Municipalities: %d\n", nrow(mun_nowcast)))
cat(sprintf("Nowcast factor: %.4f\n", nowcast_factor))
cat(sprintf("Mean net_income_equiv: %.0f -> %.0f\n",
            mean(mun$net_income_equiv, na.rm = TRUE),
            mean(mun_nowcast$net_income_equiv, na.rm = TRUE)))

write_fst(mun_nowcast, "data/municipality_stats.fst")
cat("Saved data/municipality_stats.fst\n")
