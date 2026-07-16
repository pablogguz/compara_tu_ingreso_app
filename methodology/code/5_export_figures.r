#-----------------------------------------------------------------------------
# Project: validation metrics for www.comparatuingreso.es
# Author: Pablo Garcia Guzman
# This script: re-exports the three figures shown in the methodology note with a
#   single, consistent, publication style (Source Serif 4 -- the paper font --,
#   shared theme, identical canvas). Overwrites the PNGs referenced by the .tex.
#     - output/binned_scatter_mean_2023.png     (validation: mean)
#     - output/binned_scatter_p80p20_2023.png   (validation: P80/P20)
#     - output/variance_decomp_2023.png         (hierarchical variance decomp.)
#-----------------------------------------------------------------------------

packages_to_load <- c("tidyverse", "data.table", "haven", "scales",
                      "ragg", "systemfonts", "ineAtlas")
invisible(lapply(packages_to_load, function(p) {
  if (!require(p, character.only = TRUE)) install.packages(p, dependencies = TRUE)
  require(p, character.only = TRUE)
}))

dir.create("output", showWarnings = FALSE, recursive = TRUE)

#-----------------------------------------------------------------------------
# Shared style: font, theme, palette, canvas
#-----------------------------------------------------------------------------
# Register the paper's serif (Source Serif Pro / "Source Serif 4") as variable-
# font weights so headings can be a touch heavier than body text.
register_variant("Paper Serif",          family = "Source Serif 4", weight = "normal")
register_variant("Paper Serif Semibold", family = "Source Serif 4", weight = "semibold")
FONT  <- "Paper Serif"
FONTB <- "Paper Serif Semibold"

# Consistent palette (blues, cohesive with the note)
INK     <- "#1A1A1A"   # near-black text/axes
GRID    <- "#E6E6E6"   # faint horizontal gridlines
DOT     <- "#2E6FB0"   # binned scatter points
DOTLINE <- "#0B3D66"   # fit / reference line
BAR_PAL <- c("#0B3D66", "#2E6FB0", "#7FB0DA", "#CFE0EF")  # dark -> light

# Shared canvas — every figure is saved at exactly these dimensions
FIG_W <- 8; FIG_H <- 6; FIG_DPI <- 300

theme_paper <- function(base_size = 15) {
  theme_minimal(base_size = base_size, base_family = FONT) %+replace%
    theme(
      text             = element_text(colour = INK, family = FONT),
      axis.text        = element_text(colour = INK, size = rel(0.9)),
      axis.title.x     = element_text(colour = INK, margin = margin(t = 8)),
      axis.title.y     = element_text(colour = INK, margin = margin(r = 8), angle = 90),
      axis.ticks       = element_line(colour = GRID, linewidth = 0.3),
      panel.grid.major = element_line(colour = GRID, linewidth = 0.35),
      panel.grid.minor = element_blank(),
      panel.grid.major.x = element_blank(),
      panel.grid.minor.x = element_blank(),
      plot.margin      = margin(12, 16, 10, 12),
      legend.position  = "top",
      legend.justification = c(0, 1),
      legend.title     = element_blank(),
      legend.text      = element_text(size = rel(0.8), colour = INK),
      legend.key.size  = unit(0.9, "lines"),
      complete = TRUE
    )
}

save_fig <- function(plot, file) {
  ggsave(file.path("output", file), plot, device = ragg::agg_png,
         width = FIG_W, height = FIG_H, dpi = FIG_DPI, bg = "white")
  message("saved output/", file)
}

#-----------------------------------------------------------------------------
# Helper: population-weighted binscatter (equal-population bins)
#-----------------------------------------------------------------------------
wbinscatter <- function(df, xvar, yvar, wvar, nbins = 40) {
  d <- df %>%
    transmute(x = .data[[xvar]], y = .data[[yvar]], w = .data[[wvar]]) %>%
    filter(is.finite(x), is.finite(y), is.finite(w), w > 0) %>%
    arrange(x)
  d$cw  <- cumsum(d$w) / sum(d$w)
  d$bin <- cut(d$cw, breaks = seq(0, 1, length.out = nbins + 1),
               include.lowest = TRUE, labels = FALSE)
  d %>% group_by(bin) %>%
    summarise(x = weighted.mean(x, w), y = weighted.mean(y, w), .groups = "drop")
}

# weighted OLS beta + R2 (matches Stata reghdfe ... [aw=], noabsorb)
wstats <- function(df, xvar, yvar, wvar) {
  d <- df %>% transmute(x = .data[[xvar]], y = .data[[yvar]], w = .data[[wvar]]) %>%
    filter(is.finite(x), is.finite(y), is.finite(w), w > 0)
  m <- lm(y ~ x, data = d, weights = w)
  list(beta = unname(coef(m)[2]), r2 = summary(m)$r.squared,
       intercept = unname(coef(m)[1]),
       xr = range(d$x), yr = range(d$y))
}

validation_plot <- function(df, xvar, yvar, wvar, xlab, ylab, nbins = 30) {
  pts <- wbinscatter(df, xvar, yvar, wvar, nbins)
  st  <- wstats(df, xvar, yvar, wvar)
  lab <- sprintf("R² = %.3f\nβ = %.3f", st$r2, st$beta)
  TXT <- 22  # one size (pt) shared by axis titles, axis tick labels, and the in-chart label
  ggplot(pts, aes(x, y)) +
    geom_abline(slope = st$beta, intercept = st$intercept,
                colour = DOTLINE, linewidth = 1.5, alpha = 0.45) +
    geom_point(colour = DOT, fill = DOT, size = 5, alpha = 0.85, stroke = 0) +
    annotate("text", x = -Inf, y = Inf, label = lab,
             family = FONT, size = TXT / .pt, colour = INK,
             hjust = -0.12, vjust = 1.3, lineheight = 1.05) +
    scale_x_continuous(labels = label_comma()) +
    scale_y_continuous(labels = label_comma(), expand = expansion(mult = c(0.03, 0.08))) +
    labs(x = xlab, y = ylab) +
    theme_paper(base_size = 24) +
    theme(axis.title = element_text(size = TXT),
          axis.text  = element_text(size = TXT, colour = INK))
}

#-----------------------------------------------------------------------------
# Figures 1 & 2 — validation of log-normality
#-----------------------------------------------------------------------------
val <- read_dta("data-raw/expected.dta")

p_mean <- validation_plot(
  val, "net_income_equiv", "expected_mean", "population",
  xlab = "Observed mean income per equivalent adult",
  ylab = "Expected mean from\nlog-normality"
)
save_fig(p_mean, "binned_scatter_mean_2023.png")

p_p80 <- validation_plot(
  val, "p80p20", "expected_p80p20", "population",
  xlab = "Observed P80/P20 ratio",
  ylab = "Expected P80/P20 ratio\nfrom log-normality"
)
save_fig(p_p80, "binned_scatter_p80p20_2023.png")

#-----------------------------------------------------------------------------
# Figure 3 — hierarchical variance decomposition (rebuilt from 4a logic)
#-----------------------------------------------------------------------------
weighted.var <- function(x, w) { mu <- weighted.mean(x, w); sum(w * (x - mu)^2) / sum(w) }

atlas <- merge(
  setDT(ineAtlas::get_atlas("income", "tract")),
  setDT(ineAtlas::get_atlas("demographics", "tract"))
) %>% as_tibble() %>% filter(year == 2023) %>%
  left_join(ineAtlas::get_atlas("gini_p80p20", "tract") %>% as_tibble() %>%
              filter(year == 2023) %>% select(tract_code, gini), by = "tract_code")

ccaa_mapping <- tibble(
  prov_code = c("01","20","48","02","13","16","19","45","28","03","12","46",
                "04","11","14","18","21","23","29","41","05","09","24","34","37","40","42","47","49",
                "06","10","07","08","17","25","43","15","27","32","36","22","44","50","26","30","31",
                "33","35","38","39","51","52"),
  ccaa_name = c(rep("Basque Country",3), rep("Castile-La Mancha",5), "Madrid",
                rep("Valencian Community",3), rep("Andalusia",8), rep("Castile and Leon",9),
                rep("Extremadura",2), "Balearic Islands", rep("Catalonia",4), rep("Galicia",4),
                rep("Aragon",3), "La Rioja", "Murcia", "Navarre", "Asturias",
                rep("Canary Islands",2), "Cantabria", rep("Ceuta and Melilla",2))
)

atlas <- atlas %>%
  filter(!is.na(median_income_equiv), !is.na(population), !is.na(gini)) %>%
  mutate(sigma = sqrt(2) * qnorm((gini/100 + 1)/2),
         within_var = sigma^2, mu_log = log(median_income_equiv))

vdecomp <- atlas %>%
  left_join(ccaa_mapping, by = "prov_code") %>%
  group_by(prov_code) %>% mutate(prov_mean = weighted.mean(mu_log, population)) %>% ungroup() %>%
  group_by(mun_code)  %>% mutate(mun_mean  = weighted.mean(mu_log, population)) %>% ungroup() %>%
  group_by(ccaa_name) %>%
  summarise(between_total = weighted.var(mu_log, population),
            between_prov  = weighted.var(prov_mean, population),
            between_mun   = weighted.var(mun_mean, population) - between_prov,
            between_tract = between_total - weighted.var(mun_mean, population),
            within_tract  = weighted.mean(within_var, population),
            total_var     = within_tract + between_total,
            population    = sum(population), .groups = "drop") %>%
  mutate(across(c(between_prov, between_mun, between_tract, within_tract),
                ~ . / total_var * 100, .names = "{.col}_share"))

lvls <- c("within_tract_share","between_tract_share","between_mun_share","between_prov_share")
labs <- c("Within tract", "Between tracts\n(within municipality)",
          "Between municipalities\n(within province)", "Between provinces")

plot_data <- vdecomp %>%
  select(ccaa_name, all_of(lvls)) %>%
  pivot_longer(all_of(lvls), names_to = "component", values_to = "share") %>%
  mutate(component = factor(component, levels = lvls, labels = labs)) %>%
  drop_na() %>% filter(ccaa_name != "Ceuta and Melilla")

order_ccaa <- vdecomp %>% arrange(within_tract_share) %>% pull(ccaa_name)

p_var <- ggplot(plot_data,
                aes(x = factor(ccaa_name, levels = order_ccaa), y = share, fill = component)) +
  geom_col(width = 0.78) +
  coord_flip() +
  scale_fill_manual(values = setNames(BAR_PAL, labs),
                    guide = guide_legend(nrow = 2, byrow = TRUE, keywidth = unit(0.9, "lines"))) +
  scale_y_continuous(expand = expansion(mult = c(0, 0.02)),
                     labels = function(x) paste0(x, "%")) +
  labs(x = NULL, y = "Per cent of total variance") +
  theme_paper() +
  theme(panel.grid.major.y = element_blank(),
        panel.grid.major.x = element_line(colour = GRID, linewidth = 0.35))

save_fig(p_var, "variance_decomp_2023.png")

message("\nAll three figures re-exported at ", FIG_W, "x", FIG_H, " in, ", FIG_DPI, " dpi.")
