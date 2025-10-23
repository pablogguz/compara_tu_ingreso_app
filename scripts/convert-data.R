#!/usr/bin/env Rscript

# Convert FST files to Apache Arrow (Feather v2) format
# This script preserves all column names and data types from the original Shiny app

library(fst)
library(arrow)
library(dplyr)

cat("Converting FST files to Arrow format...\n\n")

# Input and output directories
input_dir <- "data"
output_dir <- "public/data"

# Create output directory if it doesn't exist
if (!dir.exists(output_dir)) {
  dir.create(output_dir, recursive = TRUE)
}

# Function to convert FST to Arrow
convert_fst_to_arrow <- function(input_file, output_file) {
  cat(sprintf("Converting %s -> %s\n", input_file, output_file))
  
  # Read FST file
  data <- read_fst(input_file)
  
  # Write as Arrow (Feather v2) with NO COMPRESSION for browser compatibility
  write_feather(data, output_file, compression = "uncompressed")
  
  cat(sprintf("  ✓ Converted %d rows, %d columns\n", nrow(data), ncol(data)))
}

# Convert main data files
convert_fst_to_arrow(
  file.path(input_dir, "national_percentiles.fst"),
  file.path(output_dir, "national_percentiles.arrow")
)

convert_fst_to_arrow(
  file.path(input_dir, "provincial_percentiles.fst"),
  file.path(output_dir, "provincial_percentiles.arrow")
)

convert_fst_to_arrow(
  file.path(input_dir, "mun_percentiles.fst"),
  file.path(output_dir, "mun_percentiles.arrow")
)

convert_fst_to_arrow(
  file.path(input_dir, "municipality_lookup.fst"),
  file.path(output_dir, "municipality_lookup.arrow")
)

convert_fst_to_arrow(
  file.path(input_dir, "density_curve.fst"),
  file.path(output_dir, "density_curve.arrow")
)

convert_fst_to_arrow(
  file.path(input_dir, "density_curve_prov.fst"),
  file.path(output_dir, "density_curve_prov.arrow")
)

convert_fst_to_arrow(
  file.path(input_dir, "municipality_stats.fst"),
  file.path(output_dir, "municipality_stats.arrow")
)

# Convert municipal density curves (by province)
mun_density_input_dir <- file.path(input_dir, "density_curve_mun")
mun_density_output_dir <- file.path(output_dir, "density_curve_mun")

if (!dir.exists(mun_density_output_dir)) {
  dir.create(mun_density_output_dir, recursive = TRUE)
}

# Get all mun_*.fst files
mun_files <- list.files(
  mun_density_input_dir,
  pattern = "^mun_.*\\.fst$",
  full.names = FALSE
)

cat(sprintf("\nConverting %d municipal density files...\n", length(mun_files)))

for (mun_file in mun_files) {
  input_path <- file.path(mun_density_input_dir, mun_file)
  output_path <- file.path(
    mun_density_output_dir,
    sub("\\.fst$", ".arrow", mun_file)
  )
  
  convert_fst_to_arrow(input_path, output_path)
}

cat("\n✓ All files converted successfully!\n")
cat(sprintf("Output directory: %s\n", output_dir))

# Print summary
cat("\nFile Summary:\n")
cat("=============\n")
cat(sprintf("- National percentiles\n"))
cat(sprintf("- Provincial percentiles\n"))
cat(sprintf("- Municipal percentiles\n"))
cat(sprintf("- Municipality lookup\n"))
cat(sprintf("- National density curve\n"))
cat(sprintf("- Provincial density curves\n"))
cat(sprintf("- Municipal density curves (%d files)\n", length(mun_files)))
cat(sprintf("- Municipality statistics\n"))
cat("\nReady for Next.js build!\n")
