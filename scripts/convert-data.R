#!/usr/bin/env Rscript

# Convert the pipeline's FST outputs (methodology/data) to Apache Arrow
# (Feather v2, uncompressed: the browser's apache-arrow reader does not
# handle LZ4/ZSTD) for the app (public/data). Run from the repository root
# after methodology/run_pipeline.sh -- or let that script call it.
#
# The app downloads only what one household needs, so everything that is
# per municipality is split by province, and the density curves (only ever
# drawn) are kept on a 500-euro grid in float32:
#
#   national.json                        Spain: percentiles 1..99 and the density curve
#   municipality_lookup.json             provinces [code, name], municipalities [code, name]
#   provincial_percentiles.arrow         percentile, one column per province
#   mun_percentiles/mun_<prov>.arrow     percentile, one column per municipality
#   density_curve_prov.arrow             x, one column per province
#   density_curve_mun/mun_<prov>.arrow   x, one column per municipality
#   municipality_stats/mun_<prov>.arrow  the province's rows of municipality_stats
#
# What the landing page needs (Spain and the municipality list) is plain JSON,
# so the Arrow reader is only loaded once a municipality is chosen.

suppressPackageStartupMessages({
  library(fst)
  library(arrow)
  library(data.table)
  library(jsonlite)
})

input_dir <- "methodology/data"
output_dir <- "public/data"
GRID <- seq(0, 160000, by = 500)   # the charts sample every 500 euros up to 90,000

write_arrow <- function(df, path, float32 = character()) {
  tbl <- arrow_table(as.data.frame(df))
  if (length(float32)) {
    fields <- lapply(names(df), function(n) {
      field(n, if (n %in% float32) float32() else tbl$schema$GetFieldByName(n)$type)
    })
    tbl <- tbl$cast(schema(fields))
  }
  write_feather(tbl, path, compression = "uncompressed")
}

fresh_dir <- function(path) {
  unlink(path, recursive = TRUE)
  dir.create(path, recursive = TRUE)
}

# a long density (code, x, y) -> x on GRID plus one column per code
wide_density <- function(d, code) {
  d <- as.data.table(d)
  out <- data.table(x = GRID)
  for (k in sort(unique(d[[code]]))) {
    s <- d[get(code) == k][order(x)]
    set(out, j = k, value = approx(s$x, s$y, xout = GRID, rule = 2)$y)
  }
  out
}

dir.create(output_dir, showWarnings = FALSE, recursive = TRUE)
unlink(file.path(output_dir, c("mun_percentiles.arrow", "municipality_stats.arrow", "national_percentiles.arrow",
                                "density_curve.arrow", "municipality_lookup.arrow")))

# ---- Spain and the municipality list (JSON) ----
nat_p <- as.data.table(read_fst(file.path(input_dir, "national_percentiles.fst")))[order(percentile)]
stopifnot(nrow(nat_p) == 99)
nat <- as.data.table(read_fst(file.path(input_dir, "density_curve.fst")))[order(x)]
json_numbers <- function(v, fmt) paste0("[", paste(sprintf(fmt, v), collapse = ","), "]")
writeLines(sprintf('{"percentiles":%s,"density":{"x":%s,"y":%s}}',
                   json_numbers(nat_p$value, "%.17g"),   # exact: the percentile lookup depends on them
                   json_numbers(GRID, "%.0f"),
                   json_numbers(approx(nat$x, nat$y, xout = GRID, rule = 2)$y, "%.6g")),
           file.path(output_dir, "national.json"))

lookup <- as.data.table(read_fst(file.path(input_dir, "municipality_lookup.fst")))
stopifnot(all(substr(lookup$mun_code, 1, 2) == lookup$prov_code))   # the province is the code's prefix
provs <- unique(lookup[, .(prov_code, prov_name)])[order(prov_code)]
write(toJSON(list(provinces = unname(as.matrix(provs)), municipalities = unname(as.matrix(lookup[, .(mun_code, mun_name)])))),
      file.path(output_dir, "municipality_lookup.json"))

# ---- percentiles ----
write_arrow(read_fst(file.path(input_dir, "provincial_percentiles.fst")),
            file.path(output_dir, "provincial_percentiles.arrow"))

mun_perc <- as.data.table(read_fst(file.path(input_dir, "mun_percentiles.fst")))
mun_cols <- setdiff(names(mun_perc), "percentile")
fresh_dir(file.path(output_dir, "mun_percentiles"))
for (prov in sort(unique(substr(mun_cols, 1, 2)))) {
  cols <- mun_cols[substr(mun_cols, 1, 2) == prov]
  write_arrow(mun_perc[, c("percentile", cols), with = FALSE],
              file.path(output_dir, "mun_percentiles", sprintf("mun_%s.arrow", prov)))
}
cat(sprintf("Percentiles: Spain, %d provinces, %d municipalities in %d files\n",
            ncol(read_fst(file.path(input_dir, "provincial_percentiles.fst"))) - 1,
            length(mun_cols), length(unique(substr(mun_cols, 1, 2)))))

# ---- density curves ----
prov_d <- wide_density(read_fst(file.path(input_dir, "density_curve_prov.fst")), "prov_code")
write_arrow(prov_d, file.path(output_dir, "density_curve_prov.arrow"), float32 = setdiff(names(prov_d), "x"))

fresh_dir(file.path(output_dir, "density_curve_mun"))
mun_files <- list.files(file.path(input_dir, "density_curve_mun"), pattern = "^mun_.*\\.fst$")
for (f in mun_files) {
  w <- wide_density(read_fst(file.path(input_dir, "density_curve_mun", f)), "mun_code")
  write_arrow(w, file.path(output_dir, "density_curve_mun", sub("\\.fst$", ".arrow", f)),
              float32 = setdiff(names(w), "x"))
}
cat(sprintf("Density curves: Spain, %d provinces, %d province files of municipalities (%d points each)\n",
            ncol(prov_d) - 1, length(mun_files), length(GRID)))

# ---- municipality statistics ----
stats <- as.data.table(read_fst(file.path(input_dir, "municipality_stats.fst")))
fresh_dir(file.path(output_dir, "municipality_stats"))
for (prov in sort(unique(stats$prov_code))) {
  write_arrow(stats[prov_code == prov], file.path(output_dir, "municipality_stats", sprintf("mun_%s.arrow", prov)))
}
cat(sprintf("Municipality statistics: %d municipalities in %d files\n", nrow(stats), uniqueN(stats$prov_code)))

sizes <- file.info(list.files(output_dir, recursive = TRUE, full.names = TRUE))$size
cat(sprintf("\npublic/data: %d files, %.1f MB in total\n", length(sizes), sum(sizes) / 1e6))
