#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: nowcasts the municipality statistics from the ADRH
#*   base year (2023) to 2024 by scaling equivalised income with the
#*   national factor from 0d. ecv_nowcast.r. The demographic columns
#*   are left as they are.
#*
#* Input : data-raw/municipality_stats_2023.fst (from 3a. mun_stats.r)
#*         data-raw/nowcast_factor.fst          (from 0d. ecv_nowcast.r)
#* Output: data/municipality_stats.fst
#-------------------------------------------------------------

packages_to_load <- c("tidyverse", "fst")
lapply(packages_to_load, require, character.only = TRUE)
#-------------------------------------------------------------------

nowcast_factor <- read_fst("data-raw/nowcast_factor.fst")$factor
stopifnot(length(nowcast_factor) == 1, is.finite(nowcast_factor))

mun <- read_fst("data-raw/municipality_stats_2023.fst")
stopifnot("net_income_equiv" %in% names(mun))

mun_nowcast <- mun %>%
    mutate(net_income_equiv = net_income_equiv * nowcast_factor)

cat(sprintf("Municipalities: %d\n", nrow(mun_nowcast)))
cat(sprintf("Nowcast factor: %.4f\n", nowcast_factor))
cat(sprintf("Mean net_income_equiv: %.0f -> %.0f\n",
            mean(mun$net_income_equiv, na.rm = TRUE),
            mean(mun_nowcast$net_income_equiv, na.rm = TRUE)))

write_fst(mun_nowcast, "data/municipality_stats.fst")
cat("Saved data/municipality_stats.fst\n")
