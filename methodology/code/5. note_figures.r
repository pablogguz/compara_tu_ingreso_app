#-----------------------------------------------------------------------------
# Project: validation metrics for www.comparatuingreso.es
# Author: Pablo Garcia Guzman
# This script: the three figures of the methodology note, from the ADRH base
#   year and the tract GB2 fits, in one publication style (Source Serif 4).
#     - output/fig_validation_skew.png    log(mean/median): observed vs fitted
#     - output/fig_validation_p80p20.png  P80/P20: observed vs fitted
#     - output/fig_variance_decomp.png    variance decomposition by community
#-----------------------------------------------------------------------------

packages_to_load <- c("tidyverse", "data.table", "scales", "ragg", "systemfonts", "ineAtlas", "fst", "matrixStats")
invisible(lapply(packages_to_load, function(p) {
  if (!require(p, character.only = TRUE)) install.packages(p, dependencies = TRUE)
  suppressPackageStartupMessages(require(p, character.only = TRUE))
}))
source("code/note_data.r")

dir.create("output", showWarnings = FALSE, recursive = TRUE)

#-----------------------------------------------------------------------------
# Shared style
#-----------------------------------------------------------------------------
FONT <- if ("Source Serif 4" %in% systemfonts::system_fonts()$family) {
  register_variant("Paper Serif", family = "Source Serif 4", weight = "normal")
  "Paper Serif"
} else "serif"

INK     <- "#1A1A1A"
GRID    <- "#E6E6E6"
DOT     <- "#2E6FB0"
DOTLINE <- "#0B3D66"
BAR_PAL <- c("#0B3D66", "#2E6FB0", "#7FB0DA", "#CFE0EF")
FIG_W <- 8; FIG_H <- 6; FIG_DPI <- 300

theme_paper <- function(base_size = 15) {
  theme_minimal(base_size = base_size, base_family = FONT) %+replace%
    theme(
      text               = element_text(colour = INK, family = FONT),
      axis.text          = element_text(colour = INK, size = rel(0.9)),
      axis.title.x       = element_text(colour = INK, margin = margin(t = 8)),
      axis.title.y       = element_text(colour = INK, margin = margin(r = 8), angle = 90),
      axis.ticks         = element_line(colour = GRID, linewidth = 0.3),
      panel.grid.major   = element_line(colour = GRID, linewidth = 0.35),
      panel.grid.minor   = element_blank(),
      plot.margin        = margin(12, 16, 10, 12),
      legend.position    = "top",
      legend.justification = c(0, 1),
      legend.title       = element_blank(),
      legend.text        = element_text(size = rel(0.8), colour = INK),
      legend.key.size    = unit(0.9, "lines"),
      complete = TRUE
    )
}

save_fig <- function(plot, file) {
  ggsave(file.path("output", file), plot, device = ragg::agg_png,
         width = FIG_W, height = FIG_H, dpi = FIG_DPI, bg = "white")
  message("saved output/", file)
}

# Population-weighted binscatter with equal-population bins
wbinscatter <- function(x, y, w, nbins = 30) {
  d <- data.table(x, y, w)[is.finite(x) & is.finite(y) & w > 0][order(x)]
  d[, bin := cut(cumsum(w) / sum(w), breaks = seq(0, 1, length.out = nbins + 1),
                 include.lowest = TRUE, labels = FALSE)]
  d[, .(x = weighted.mean(x, w), y = weighted.mean(y, w)), by = bin]
}

# Calibration plot: observed (y) against predicted (x), with the 45-degree
# line and the population-weighted regression of observed on predicted
calibration_plot <- function(pred, obs, w, xlab, ylab, digits = 2) {
  pts <- wbinscatter(pred, obs, w)
  fit <- wls(obs, pred, w)
  lab <- sprintf("Slope = %.2f\nR² = %.2f", fit$slope, fit$r2)
  TXT <- 22
  rng <- range(c(pts$x, pts$y))
  ggplot(pts, aes(x, y)) +
    geom_abline(slope = 1, intercept = 0, colour = "grey55", linewidth = 0.8, linetype = "dashed") +
    geom_abline(slope = fit$slope, intercept = fit$intercept,
                colour = DOTLINE, linewidth = 1.5, alpha = 0.45) +
    geom_point(colour = DOT, size = 5, alpha = 0.85, stroke = 0) +
    annotate("text", x = -Inf, y = Inf, label = lab, family = FONT, size = TXT / .pt,
             colour = INK, hjust = -0.12, vjust = 1.3, lineheight = 1.05) +
    scale_x_continuous(labels = label_number(accuracy = 10^-digits)) +
    scale_y_continuous(labels = label_number(accuracy = 10^-digits),
                       expand = expansion(mult = c(0.03, 0.08))) +
    coord_cartesian(xlim = rng, ylim = rng) +
    labs(x = xlab, y = ylab) +
    theme_paper(base_size = 24) +
    theme(axis.title = element_text(size = TXT), axis.text = element_text(size = TXT, colour = INK))
}

#-----------------------------------------------------------------------------
# Figures 1 and 2: tract GB2 fits against the published indicators
#-----------------------------------------------------------------------------
atlas <- adrh_tracts()
tf <- tract_fits()
val <- validation_tracts(tf, atlas)

save_fig(
  calibration_plot(val$log_ratio_fit, val$log_ratio_obs, val$population,
                   xlab = "Fitted log(mean / median)",
                   ylab = "Observed log(mean / median)"),
  "fig_validation_skew.png"
)

save_fig(
  calibration_plot(val$fit_p80p20, val$obs_p80p20, val$population,
                   xlab = "Fitted P80/P20",
                   ylab = "Observed P80/P20"),
  "fig_validation_p80p20.png"
)

#-----------------------------------------------------------------------------
# Figure 3: variance decomposition by autonomous community
#-----------------------------------------------------------------------------
vd <- variance_decomposition(tf)$by_ccaa

lvls <- c("within", "between_tract", "between_mun", "between_prov")
labs <- c("Within tract", "Between tracts\n(within municipality)",
          "Between municipalities\n(within province)", "Between provinces")

plot_data <- melt(vd, id.vars = "ccaa", measure.vars = lvls, variable.name = "component", value.name = "share")
plot_data[, component := factor(component, levels = lvls, labels = labs)]
order_ccaa <- vd[order(within), ccaa]

p_var <- ggplot(plot_data, aes(x = factor(ccaa, levels = order_ccaa), y = share, fill = component)) +
  geom_col(width = 0.78) +
  coord_flip() +
  scale_fill_manual(values = setNames(BAR_PAL, labs),
                    guide = guide_legend(nrow = 2, byrow = TRUE, keywidth = unit(0.9, "lines"))) +
  scale_y_continuous(expand = expansion(mult = c(0, 0.02)), labels = function(x) paste0(x, "%")) +
  labs(x = NULL, y = "Per cent of total variance") +
  theme_paper() +
  theme(panel.grid.major.y = element_blank(),
        panel.grid.major.x = element_line(colour = GRID, linewidth = 0.35))

save_fig(p_var, "fig_variance_decomp.png")
