#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: imputes the Gini coefficient of the tracts where the
#*   ADRH does not publish it (tracts with fewer than 100 residents).
#*
#* Model: XGBoost on tract demographics, log equivalised income and
#*   province dummies. It is compared with OLS on the same predictors
#*   (province fixed effects) and with a constant, using the same
#*   5-fold cross-validation folds.
#*
#* Output: data-raw/gini_predicted.fst  -- imputed Gini by tract
#*         data-raw/gini_model_cv.fst   -- cross-validated metrics
#-------------------------------------------------------------

packages_to_load <- c("data.table", "ineAtlas", "xgboost", "fst")

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

# Model settings (reported in the note)
K_FOLDS   <- 5
NROUNDS   <- 100
MAX_DEPTH <- 6
ETA       <- 0.3
SEED      <- 123
# Extrapolation check: train on tracts with at least SMALL_TRAIN_MIN
# residents, test on tracts with 100 to SMALL_TRAIN_MIN - 1 residents
SMALL_TRAIN_MIN <- 300

# ------------------------- Prepare data ---------------------------
atlas <- merge(
  setDT(ineAtlas::get_atlas("income", "tract")),
  setDT(ineAtlas::get_atlas("demographics", "tract"))
)[year == BASE_YEAR]

gini <- setDT(ineAtlas::get_atlas("gini_p80p20", "tract"))[year == BASE_YEAR, .(tract_code, gini)]
atlas <- merge(atlas, gini, by = "tract_code")

atlas[, dependency_ratio := (pct_under18 + pct_over65) / (100 - pct_under18 - pct_over65)]

# Impute equivalised income from income per person with the provincial,
# population-weighted ratio of the two (same rule as 1b. fit_gb2.r)
atlas[, ratio := weighted.mean(net_income_equiv / net_income_pc, w = population, na.rm = TRUE),
      by = prov_code]
atlas[is.na(net_income_equiv) & !is.na(net_income_pc), net_income_equiv := net_income_pc * ratio]
atlas[, log_income_equiv := log(net_income_equiv)]

features <- c("log_income_equiv", "dependency_ratio", "mean_age", "pct_single_hh",
              "pct_under18", "mean_hh_size", "population")

# Province dummies, with the same columns for training and prediction
prov_levels <- sort(unique(atlas$prov_code))
design <- function(d) {
  prov <- model.matrix(~ factor(prov_code, levels = prov_levels) - 1, d)
  colnames(prov) <- paste0("prov_", prov_levels)
  cbind(as.matrix(d[, ..features]), prov)
}

train <- atlas[!is.na(gini) & complete.cases(atlas[, ..features])]
target <- atlas[is.na(gini) & !is.na(log_income_equiv)]

cat(sprintf("Training tracts: %d | tracts to impute: %d\n", nrow(train), nrow(target)))

# ------------------------- Cross-validation ---------------------------
metrics <- function(actual, predicted) {
  data.table(
    rmse = sqrt(mean((actual - predicted)^2)),
    mae  = mean(abs(actual - predicted)),
    mape = 100 * mean(abs(actual - predicted) / actual),
    r2   = 1 - sum((actual - predicted)^2) / sum((actual - mean(actual))^2)
  )
}

fit_xgb <- function(x, y) {
  xgb.train(
    params = list(objective = "reg:squarederror", max_depth = MAX_DEPTH, eta = ETA),
    data = xgb.DMatrix(x, label = y),
    nrounds = NROUNDS,
    verbose = 0
  )
}

ols_formula <- as.formula(paste("gini ~", paste(features, collapse = " + "), "+ factor(prov_code)"))

set.seed(SEED)
fold <- sample(rep(seq_len(K_FOLDS), length.out = nrow(train)))
x_train <- design(train)

oof <- data.table(gini = train$gini, constant = NA_real_, ols = NA_real_, xgb = NA_real_)
for (k in seq_len(K_FOLDS)) {
  fit <- fold != k
  oof[!fit, constant := mean(train$gini[fit])]
  oof[!fit, ols := predict(lm(ols_formula, data = train[fit]), newdata = train[!fit])]
  oof[!fit, xgb := predict(fit_xgb(x_train[fit, ], train$gini[fit]), x_train[!fit, ])]
}

cv <- rbind(
  cbind(model = "constant", metrics(oof$gini, oof$constant)),
  cbind(model = "ols",      metrics(oof$gini, oof$ols)),
  cbind(model = "xgb",      metrics(oof$gini, oof$xgb))
)

# Extrapolation check towards small tracts (the imputation targets are
# all below 100 residents, outside the training sample)
big   <- train$population >= SMALL_TRAIN_MIN
small <- train$population < SMALL_TRAIN_MIN
m_big <- fit_xgb(x_train[big, ], train$gini[big])
cv <- rbind(cv, cbind(model = "xgb_small_tracts",
                      metrics(train$gini[small], predict(m_big, x_train[small, ]))))

cv[, `:=`(
  n_train = nrow(train), n_target = nrow(target), n_small_test = sum(small),
  k_folds = K_FOLDS, nrounds = NROUNDS, max_depth = MAX_DEPTH, eta = ETA,
  small_train_min = SMALL_TRAIN_MIN, gini_sd = sd(train$gini),
  gini_obs_mean = mean(train$gini)
)]

cat("\nOut-of-fold performance (same folds for every model):\n")
print(cv[, .(model, rmse = round(rmse, 3), mae = round(mae, 3), mape = round(mape, 2), r2 = round(r2, 3))])

# ------------------------- Final model ---------------------------
final_xgb <- fit_xgb(x_train, train$gini)
predicted_gini <- data.frame(
  tract_code = target$tract_code,
  gini = predict(final_xgb, design(target))
)
cv[, gini_pred_mean := mean(predicted_gini$gini)]

write_fst(predicted_gini, "data-raw/gini_predicted.fst")
write_fst(as.data.frame(cv), "data-raw/gini_model_cv.fst")
cat("\nSaved data-raw/gini_predicted.fst and data-raw/gini_model_cv.fst\n")
