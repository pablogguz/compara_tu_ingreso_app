#-------------------------------------------------------------
#* Author: Pablo Garcia Guzman
#* Project: validation metrics for www.comparatuingreso.es
#* This script: GB2 engine, sourced by 1b. fit_gb2.r, 1c. gb2_holdout.r,
#*   2. prep_distributions.r and the note scripts (not run on its own).
#*
#* Each census tract's distribution of income per consumption unit is a
#* GB2, F(x) = I_t(p, q) with t = z / (1 + z), z = (x / b)^a, fitted by
#* weighted minimum distance to the 13 indicators the ADRH publishes for
#* the tract (median, mean, Gini, P80/P20 and nine population shares).
#* Parameterisation theta = (log a, log median, log p, log(a q - 1)).
#* Solver: Levenberg-Marquardt vectorised across tracts (every tract is an
#* independent small problem; all are advanced in lock-step).
#*
#* Ported unchanged from the method comparison (approach A, configuration
#* "gb2, full, balanced"): families, indicators, residuals, solver,
#* tolerances, starting values and the share prior. Only the data plumbing
#* differs: the national median behind the relative thresholds is set with
#* gb2_setup(), and the caps are located on the tract table passed in.
#-------------------------------------------------------------

suppressPackageStartupMessages({ library(data.table); library(matrixStats); library(parallel) })

CAP_INC <- 3e6                       # incomes per consumption unit above this are impossible (gross capped at 3M)
IND13   <- c("median", "mean", "gini", "p80p20", "below_5000", "below_7500", "below_10000",
             "below_40p", "below_50p", "below_60p", "above_140p", "above_160p", "above_200p")
SH      <- IND13[5:13]
IS_ABOVE <- c(rep(FALSE, 6), rep(TRUE, 3))

# The relative thresholds are fractions of the national median of the ADRH year
# (ADRH 2023 onwards). Call once before fitting or computing indicators.
gb2_setup <- function(nat_median) {
  NAT_MED <<- nat_median
  THR <<- c(5000, 7500, 10000, 0.4 * nat_median, 0.5 * nat_median, 0.6 * nat_median,
            1.4 * nat_median, 1.6 * nat_median, 2.0 * nat_median)
  invisible(THR)
}

# Gauss-Legendre nodes on [-1, 1] (Golub-Welsch)
gauss_legendre <- function(n) {
  i <- seq_len(n - 1); b <- i / sqrt(4 * i^2 - 1)
  J <- matrix(0, n, n); J[cbind(i, i + 1)] <- b; J[cbind(i + 1, i)] <- b
  e <- eigen(J, symmetric = TRUE)
  o <- order(e$values); list(x = e$values[o], w = 2 * e$vectors[1, o]^2)
}
GL <- gauss_legendre(20)

# ---------------------------------------------------------------- families
# Each family: k, names, unpack(theta) -> list of natural params (vectors),
# lsurv(lx, P) -> survival S(x) at log-income matrix/vector (n x K), cdf(lx, P),
# lq(u, P) -> log quantile (vector, one u), cmean(P) -> E[min(X, CAP_INC)].
# lx is an n x K matrix (row i evaluated with tract i's parameters).

## GB2: F(x) = I_{t}(p, q), t = z/(1+z), z = (x/b)^a.  theta = (log a, log median, log p, log(a q - 1)).
make_gb2 <- function(fix = c("none", "p1", "q1")) {
  fix <- match.arg(fix)
  nm <- switch(fix, none = c("la", "lmed", "lp", "laq1"), p1 = c("la", "lmed", "laq1"), q1 = c("la1", "lmed", "lp"))
  unpack <- function(th) {
    if (fix == "none") { a <- exp(th[, 1]); p <- exp(th[, 3]); q <- (1 + exp(th[, 4])) / a }
    if (fix == "p1")   { a <- exp(th[, 1]); p <- rep(1, nrow(th)); q <- (1 + exp(th[, 3])) / a }
    if (fix == "q1")   { a <- 1 + exp(th[, 1]); p <- exp(th[, 3]); q <- rep(1, nrow(th)) }
    lmed <- th[, 2]
    # scale from the median: log b = log m - logit(qbeta(.5, p, q)) / a
    t50 <- if (fix == "p1") 1 - 0.5^(1 / q) else if (fix == "q1") 0.5^(1 / p) else qbeta(0.5, p, q)
    lb <- lmed - qlogis(t50) / a
    list(a = a, p = p, q = q, lb = lb, lmed = lmed)
  }
  lsurv <- function(lx, P) {             # S(x) = I_{1-t}(q, p), computed in the upper tail for precision
    z <- P$a * (lx - P$lb)
    if (fix == "p1") return(exp(-P$q * log1p(exp(pmin(z, 700)))))
    if (fix == "q1") return(-expm1(-P$p * log1p(exp(-z))))
    pbeta(plogis(-z), P$q, P$p)
  }
  cdf <- function(lx, P) {
    z <- P$a * (lx - P$lb)
    if (fix == "p1") return(-expm1(-P$q * log1p(exp(pmin(z, 700)))))
    if (fix == "q1") return(exp(-P$p * log1p(exp(-z))))
    pbeta(plogis(z), P$p, P$q)
  }
  lq <- function(u, P) {
    t <- if (fix == "p1") 1 - (1 - u)^(1 / P$q) else if (fix == "q1") u^(1 / P$p) else qbeta(u, P$p, P$q)
    P$lb + qlogis(t) / P$a
  }
  pdf <- function(lx, P) {               # density of log income: a t^p (1-t)^q / B(p, q)
    z <- P$a * (lx - P$lb)
    exp(log(P$a) + P$p * plogis(z, log.p = TRUE) + P$q * plogis(-z, log.p = TRUE) - lbeta(P$p, P$q))
  }
  cmean <- function(P) {                 # E[min(X, C)] = E[X] I_{tC}(p + 1/a, q - 1/a) + C S(C)
    a <- P$a; p <- P$p; q <- P$q; lC <- log(CAP_INC)
    EX <- exp(P$lb + lbeta(p + 1 / a, q - 1 / a) - lbeta(p, q))
    tC <- plogis(a * (lC - P$lb))
    EX * pbeta(tC, p + 1 / a, q - 1 / a) + CAP_INC * lsurv(rep(lC, length(a)), P)
  }
  bounds <- switch(fix,
    none = rbind(c(log(0.3), log(3000), log(0.02), log(0.01)), c(log(60), log(2e5), log(80), log(400))),
    p1   = rbind(c(log(0.3), log(3000), log(0.01)), c(log(60), log(2e5), log(400))),
    q1   = rbind(c(log(0.01), log(3000), log(0.02)), c(log(60), log(2e5), log(80))))
  list(name = switch(fix, none = "gb2", p1 = "sm", q1 = "dagum"), k = length(nm), names = nm,
       unpack = unpack, lsurv = lsurv, cdf = cdf, pdf = pdf, lq = lq, cmean = cmean, lo = bounds[1, ], hi = bounds[2, ])
}

FAMILIES <- list(gb2 = make_gb2("none"), sm = make_gb2("p1"), dagum = make_gb2("q1"))

# ---------------------------------------------------------------- indicators
# The 13 ADRH indicators of each tract's fitted distribution, in published units.
# Gini: INE rule (lowest/highest 1.5% replaced by Q(.015)/Q(.985)); for the winsorised
# variable Xw on [ql, qh]:  G = 1 - (ql + int_ql^qh S^2 dx) / (ql + int_ql^qh S dx),
# integrated in log x with Gauss-Legendre on [ql, med] and [med, qh].
indicators <- function(fam, P, gini = TRUE) {
  n <- length(P[[1]])
  l015 <- fam$lq(0.015, P); l20 <- fam$lq(0.2, P); l50 <- fam$lq(0.5, P); l80 <- fam$lq(0.8, P); l985 <- fam$lq(0.985, P)
  out <- matrix(NA_real_, n, 13, dimnames = list(NULL, IND13))
  out[, 1] <- exp(l50); out[, 2] <- fam$cmean(P); out[, 4] <- exp(l80 - l20)
  if (gini) {
    half <- function(a, b) {             # nodes/weights for [a, b] (vectors)
      m <- (a + b) / 2; h <- (b - a) / 2
      list(s = outer(h, GL$x) + m, w = outer(h, GL$w))
    }
    A <- half(l015, l50); B <- half(l50, l985)
    s <- cbind(A$s, B$s); w <- cbind(A$w, B$w) * exp(s)
    S <- fam$lsurv(s, P)
    ql <- exp(l015)
    out[, 3] <- 100 * (1 - (ql + rowSums(w * S^2)) / (ql + rowSums(w * S)))
  }
  lt <- matrix(log(THR), n, 9, byrow = TRUE)
  Fb <- fam$cdf(lt[, !IS_ABOVE, drop = FALSE], P); Sa <- fam$lsurv(lt[, IS_ABOVE, drop = FALSE], P)
  out[, 5:10] <- 100 * Fb; out[, 11:13] <- 100 * Sa
  out
}

# CDF on an arbitrary grid (evaluation export); F = 1 at and above CAP_INC (capped incomes)
cdf_grid <- function(fam, P, grid, chunk = 5000) {
  n <- length(P[[1]]); out <- matrix(NA_real_, n, length(grid))
  for (s in seq(1, n, by = chunk)) {
    i <- s:min(n, s + chunk - 1); Pi <- lapply(P, `[`, i)
    out[i, ] <- fam$cdf(matrix(log(grid), length(i), length(grid), byrow = TRUE), Pi)
  }
  out[, grid >= CAP_INC] <- 1
  out
}

# ---------------------------------------------------------------- targets & residuals
# obs: n x 13 published values (NA = not used). Residual units: median/mean/p80p20 in log
# points, gini in points, shares in pp.  Each cell has a piecewise-linear residual of
# d = model - published: slope 1/s_in for |d| <= h and 1/s_out beyond, separately for d > 0
# ("up") and d < 0 ("dn"). Ordinary indicators: h = 0 (Gaussian with sd s_out). Medians are
# 700-euro bin midpoints: h = half a bin, a weak pull s_in inside and a steep s_out outside.
# Censored (capped) values: on the allowed side h = 0 with a soft s_out = s_allow.
raw_resid <- function(ind, obs) {
  d <- ind - obs
  d[, c(1, 2, 4)] <- log(ind[, c(1, 2, 4)]) - log(obs[, c(1, 2, 4)])
  d
}
pw_resid <- function(d, T, idx) {
  # smooth version of the piecewise-linear residual (softplus-rounded kinks, width delta), so that
  # Gauss-Newton steps behave near the median-bin edges and at censoring points
  g <- function(x) x[idx, , drop = FALSE]
  hu <- g(T$h_up); hd <- g(T$h_dn); siu <- g(T$sin_up); sid <- g(T$sin_dn); sou <- g(T$sout_up); sod <- g(T$sout_dn)
  del <- 0.25 * pmax(pmax(hu, hd), pmin(siu, sid, sou, sod))
  sp <- function(z) del * (pmax(z / del, 0) + log1p(exp(-abs(z / del))))
  bl <- plogis(d / del)
  d * (bl / siu + (1 - bl) / sid) + (1 / sou - 1 / siu) * sp(d - hu) - (1 / sod - 1 / sid) * sp(-d - hd)
}
make_resid_fun <- function(fam, T, prior_mu = NULL, prior_sd = NULL) {
  function(th, idx) {
    th <- pmin(pmax(th, matrix(fam$lo, nrow(th), fam$k, byrow = TRUE)), matrix(fam$hi, nrow(th), fam$k, byrow = TRUE))
    P <- fam$unpack(th)
    obs <- T$obs[idx, , drop = FALSE]
    d <- raw_resid(indicators(fam, P), obs)
    r <- pw_resid(d, T, idx)
    r[is.na(r) & !is.na(obs)] <- 1e3      # invalid model value where there is a target
    r[is.na(r)] <- 0
    if (!is.null(prior_mu)) r <- cbind(r, (th - prior_mu[idx, , drop = FALSE]) / prior_sd[idx, , drop = FALSE])
    r
  }
}
subset_targets <- function(T, i) lapply(T, function(x) if (is.matrix(x)) x[i, , drop = FALSE] else x)

# ---------------------------------------------------------------- vectorised Levenberg-Marquardt
bchol_solve <- function(A, b) {          # A: n x k x k SPD, b: n x k
  n <- dim(A)[1]; k <- dim(A)[2]; L <- array(0, c(n, k, k))
  for (j in 1:k) {
    s <- A[, j, j]; if (j > 1) for (l in 1:(j - 1)) s <- s - L[, j, l]^2
    L[, j, j] <- sqrt(pmax(s, 1e-300))
    if (j < k) for (i in (j + 1):k) {
      s <- A[, i, j]; if (j > 1) for (l in 1:(j - 1)) s <- s - L[, i, l] * L[, j, l]
      L[, i, j] <- s / L[, j, j]
    }
  }
  y <- matrix(0, n, k)
  for (i in 1:k) { s <- b[, i]; if (i > 1) for (l in 1:(i - 1)) s <- s - L[, i, l] * y[, l]; y[, i] <- s / L[, i, i] }
  x <- matrix(0, n, k)
  for (i in k:1) { s <- y[, i]; if (i < k) for (l in (i + 1):k) s <- s - L[, l, i] * x[, l]; x[, i] <- s / L[, i, i] }
  x
}

lm_vec <- function(fam, theta0, rfun, maxit = 300, h = 1e-6, tol = 1e-7, max_step = 1.5, verbose = FALSE) {
  n <- nrow(theta0); k <- ncol(theta0)
  lo <- matrix(fam$lo, n, k, byrow = TRUE); hi <- matrix(fam$hi, n, k, byrow = TRUE)
  theta <- pmin(pmax(theta0, lo), hi)
  r <- rfun(theta, seq_len(n)); m <- ncol(r)
  ssr <- rowSums(r^2); ssr[!is.finite(ssr)] <- Inf
  lambda <- rep(1e-2, n); active <- rep(TRUE, n); needJ <- rep(TRUE, n)
  J <- array(0, c(n, m, k)); iters <- integer(n); nev <- 0L
  for (it in seq_len(maxit)) {
    a <- which(active); if (!length(a)) break
    aj <- a[needJ[a]]
    if (length(aj)) {
      thj0 <- theta[aj, , drop = FALSE]; r0 <- r[aj, , drop = FALSE]
      for (j in 1:k) {
        thj <- thj0; hj <- h * pmax(1, abs(thj[, j]))
        # step inward when at an upper bound so the difference sees the feasible side
        sgn <- ifelse(thj[, j] + hj > hi[aj, j], -1, 1); thj[, j] <- thj[, j] + sgn * hj
        J[aj, , j] <- (rfun(thj, aj) - r0) / (sgn * hj)
      }
      nev <- nev + k * length(aj); needJ[aj] <- FALSE
    }
    Ja <- J[a, , , drop = FALSE]; ra <- r[a, , drop = FALSE]; na <- length(a)
    AtA <- array(0, c(na, k, k)); g <- matrix(0, na, k)
    Jl <- lapply(1:k, function(i) matrix(Ja[, , i], na, m))
    for (i in 1:k) {
      g[, i] <- rowSums(Jl[[i]] * ra)
      for (j in i:k) { v <- rowSums(Jl[[i]] * Jl[[j]]); AtA[, i, j] <- v; AtA[, j, i] <- v }
    }
    # active set: a parameter sitting at a bound whose gradient pushes outward is frozen for this step
    tha <- theta[a, , drop = FALSE]
    frz <- (tha <= lo[a, , drop = FALSE] + 1e-8 & g > 0) | (tha >= hi[a, , drop = FALSE] - 1e-8 & g < 0)
    if (any(frz)) for (i in 1:k) {
      fi <- frz[, i]; if (!any(fi)) next
      AtA[fi, i, ] <- 0; AtA[fi, , i] <- 0; AtA[fi, i, i] <- 1; g[fi, i] <- 0
    }
    D <- AtA
    dg <- sapply(1:k, function(i) AtA[, i, i])
    if (!is.matrix(dg)) dg <- matrix(dg, na, k)
    for (i in 1:k) D[, i, i] <- AtA[, i, i] + lambda[a] * (dg[, i] + 1e-6 * rowMaxs(dg) + 1e-10)
    delta <- -bchol_solve(D, g)
    delta[!is.finite(delta) | frz] <- 0
    delta <- pmin(pmax(delta, -max_step), max_step)      # per-component cap (a runaway parameter must not throttle the others)
    thn <- pmin(pmax(theta[a, , drop = FALSE] + delta, lo[a, , drop = FALSE]), hi[a, , drop = FALSE])
    rn <- rfun(thn, a); nev <- nev + na
    ssn <- rowSums(rn^2); ssn[!is.finite(ssn)] <- Inf
    ok <- ssn < ssr[a]
    impr <- ifelse(ok, (ssr[a] - ssn) / pmax(ssr[a], 1e-12), 0)
    if (any(ok)) {
      ia <- a[ok]; theta[ia, ] <- thn[ok, , drop = FALSE]; r[ia, ] <- rn[ok, , drop = FALSE]; ssr[ia] <- ssn[ok]
      lambda[ia] <- pmax(lambda[ia] / 4, 1e-7); needJ[ia] <- TRUE
    }
    lambda[a[!ok]] <- lambda[a[!ok]] * 5
    iters[a] <- it
    done <- (ok & impr < tol) | lambda[a] > 1e8 | ssr[a] < 1e-10
    active[a[done]] <- FALSE
    if (verbose && it %% 10 == 0) cat(sprintf("it %d active %d mean ssr %.3f\n", it, sum(active), mean(ssr[is.finite(ssr)])))
  }
  list(theta = theta, ssr = ssr, iters = iters, converged = !active, lambda = lambda, nev = nev, r = r)
}

# Fit a family to a set of tracts, chunked over cores. starts: list of theta matrices.
fit_family <- function(fam, T, starts, cores = 10, prior_mu = NULL, prior_sd = NULL, maxit = 300) {
  n <- nrow(T$obs)
  chunks <- split(seq_len(n), sort(rep_len(seq_len(cores), n)))
  res <- mclapply(chunks, function(ix) {
    rf <- make_resid_fun(fam, subset_targets(T, ix),
                         if (!is.null(prior_mu)) prior_mu[ix, , drop = FALSE], if (!is.null(prior_sd)) prior_sd[ix, , drop = FALSE])
    best <- NULL
    for (st in starts) {
      f <- lm_vec(fam, st[ix, , drop = FALSE], rf, maxit = maxit)
      if (is.null(best)) { best <- f; best$nstart <- 1L; best$which <- rep(1L, length(ix)) }
      else {
        b <- f$ssr < best$ssr - 1e-9
        best$theta[b, ] <- f$theta[b, ]; best$ssr[b] <- f$ssr[b]; best$iters[b] <- f$iters[b]
        best$converged[b] <- f$converged[b]; best$r[b, ] <- f$r[b, ]; best$nstart <- best$nstart + 1L
        best$which[b] <- best$nstart; best$nev <- best$nev + f$nev
      }
    }
    best
  }, mc.cores = cores)
  err <- vapply(res, inherits, TRUE, "try-error"); if (any(err)) stop(res[[which(err)[1]]])
  list(theta = do.call(rbind, lapply(res, `[[`, "theta")), ssr = unlist(lapply(res, `[[`, "ssr")),
       iters = unlist(lapply(res, `[[`, "iters")), converged = unlist(lapply(res, `[[`, "converged")),
       which = unlist(lapply(res, `[[`, "which")), nev = sum(sapply(res, `[[`, "nev")),
       r = do.call(rbind, lapply(res, `[[`, "r")))
}

# ---------------------------------------------------------------- targets
# Tolerances: the publication's own noise (rounding / 700-euro binning of quantiles) plus a
# common misfit tolerance `tol` expressed in comparable units (defaults: 0.1 pp of CDF ~ 0.1
# Gini point ~ 0.5% of the mean).  `caps_from` = the full tract table (to locate the caps).
build_targets <- function(tr, use = IND13, tol_share = 0.1, tol_mean = 0.005, tol_gini = 0.1, tol_p = 0.004,
                          med_pull = 0.02, med_out = 0.003, allow = 0.10, caps_from = tr) {
  n <- nrow(tr); M <- function(v) matrix(v, n, 13, dimnames = list(NULL, IND13))
  obs <- as.matrix(tr[, ..IND13]); obs[, setdiff(IND13, use)] <- NA
  sdv <- M(NA_real_)
  sdv[, "mean"]   <- sqrt((0.5 / tr$mean)^2 + tol_mean^2)
  sdv[, "gini"]   <- sqrt(0.1^2 / 12 + tol_gini^2)
  binned <- !is.na(tr$median) & (tr$median %% 350 == 0)     # 700-euro bin midpoints (or edges); else exact (Navarra)
  R <- tr$p80p20; q20 <- tr$median / sqrt(R); q80 <- tr$median * sqrt(R)
  sdv[, "p80p20"] <- sqrt((0.1^2 / 12) / R^2 + ifelse(binned, (700^2 / 12) * (1 / q20^2 + 1 / q80^2), 0) + tol_p^2)
  sdv[, 5:13]     <- sqrt(0.1^2 / 12 + tol_share^2)
  sdv[, "median"] <- med_out
  T <- list(obs = obs, h_up = M(0), h_dn = M(0), sin_up = sdv, sin_dn = sdv, sout_up = sdv, sout_dn = sdv)
  hm <- ifelse(binned, log1p(350 / tr$median), 0)
  T$h_up[, "median"] <- hm; T$h_dn[, "median"] <- -log1p(-350 / tr$median) * binned
  T$sin_up[, "median"] <- T$sin_dn[, "median"] <- med_pull
  # INE caps: tract indicators bounded at the population-weighted P0.1 / P99.5 across tracts;
  # values at the extreme are censored: soft on the allowed side, normal on the other.
  cap <- M(0L)
  for (k in IND13) {
    v <- caps_from[[k]]; hiv <- max(v, na.rm = TRUE); lov <- min(v, na.rm = TRUE)
    iu <- which(tr[[k]] >= hiv); il <- which(tr[[k]] <= lov)
    cap[iu, k] <- 1L; cap[il, k] <- -1L
    sa <- if (k %in% c("median", "mean", "p80p20")) allow else pmax(allow * hiv, sdv[1, k])
    sl <- if (k %in% c("median", "mean", "p80p20")) allow else pmax(allow * lov, sdv[1, k])
    T$h_up[iu, k] <- 0; T$sin_up[iu, k] <- sa; T$sout_up[iu, k] <- sa
    T$h_dn[il, k] <- 0; T$sin_dn[il, k] <- sl; T$sout_dn[il, k] <- sl
  }
  T$cap <- cap
  T
}

# ---------------------------------------------------------------- starting values
# From the log-normal fallback (fb_mu, fb_sigma) and the published median.
lmed0 <- function(tr) ifelse(is.na(tr$median), tr$fb_mu, log(tr$median))
start_dagum <- function(tr) { a <- pmax(1.8 / tr$fb_sigma, 1.2); cbind(log(a - 1), lmed0(tr), 0) }
start_sm    <- function(tr) { a <- pmax(1.8 / tr$fb_sigma, 1.2); cbind(log(a), lmed0(tr), log(a - 1)) }
gb2_from_dagum <- function(th) { a <- 1 + exp(th[, 1]); cbind(log(a), th[, 2], th[, 3], log(pmax(a - 1, 0.02))) }
gb2_from_sm    <- function(th) cbind(th[, 1], th[, 2], 0, th[, 3])

# ---------------------------------------------------------------- configuration
# Balanced tolerances (the configuration used): shares 0.4 pp, Gini 0.25 points,
# mean 1%, P80/P20 1%; medians interval-censored within the 700-euro bin.
CONFIGS <- list(
  tight = list(tol_share = 0.1, tol_gini = 0.1, tol_mean = 0.005, tol_p = 0.004, med_pull = 0.02, med_out = 0.003),
  bal   = list(tol_share = 0.4, tol_gini = 0.25, tol_mean = 0.01, tol_p = 0.01, med_pull = 0.02, med_out = 0.003)
)

# caps_from: the tract table on which INE's caps are located (all tracts of the universe)
targets_for <- function(tr, cfg, use = IND13, caps_from) do.call(build_targets, c(list(tr = tr, use = use, caps_from = caps_from), cfg))

# ---- regression prior for tract shares from core indicators ---------------------------------
share_design <- function(d) {
  x <- data.table(lm = log(d$median) - log(NAT_MED), r = log(d$mean / d$median), g = d$gini / 100 - 0.28,
                  lp = log(d$p80p20) - log(2.4), lw = log(pmax(d$w, 50)))
  X <- model.matrix(~ poly(lm, r, g, lp, degree = 3, raw = TRUE) + lw, data = x)
  X
}
fit_share_prior <- function(train, test) {
  Xtr <- share_design(train); Xte <- share_design(test)
  P <- matrix(NA_real_, nrow(test), 9, dimnames = list(NULL, SH)); rmse <- setNames(numeric(9), SH)
  for (k in SH) {
    y <- qlogis(pmin(pmax(train[[k]], 0.05), 99.95) / 100)
    # province effects as offsets estimated on the training tracts (shrunk), when the province is present
    b <- lm.fit(Xtr, y)$coefficients; b[is.na(b)] <- 0
    e <- y - Xtr %*% b
    pe <- data.table(prov = train$prov_code, e = as.vector(e))[, .(fe = sum(e) / (.N + 20)), by = prov]
    fe_tr <- pe$fe[match(train$prov_code, pe$prov)]; fe_te <- pe$fe[match(test$prov_code, pe$prov)]; fe_te[is.na(fe_te)] <- 0
    P[, k] <- 100 * plogis(as.vector(Xte %*% b) + fe_te)
    rmse[k] <- sqrt(mean((100 * plogis(as.vector(Xtr %*% b) + fe_tr) - train[[k]])^2))
  }
  list(pred = P, rmse = rmse)
}

# ---- fitting the GB2 (starts from Dagum and Singh-Maddala fits) -------------------------------
fit_gb2 <- function(tr, T, cores = 10, prior_mu = NULL, prior_sd = NULL) {
  fd <- fit_family(FAMILIES$dagum, T, list(start_dagum(tr)), cores)
  fs <- fit_family(FAMILIES$sm, T, list(start_sm(tr)), cores)
  f <- fit_family(FAMILIES$gb2, T, list(gb2_from_dagum(fd$theta), gb2_from_sm(fs$theta)), cores, prior_mu, prior_sd)
  f$nev <- f$nev + fd$nev + fs$nev
  f
}

# ---- one complete fit ("full" mode) -------------------------------------------------------------
# tr:   every tract of the universe: tract_code, mun_code, prov_code, w (population), the 13
#       published indicators (NA where not published), fb_mu / fb_sigma (log-normal fallback,
#       same year as the indicators), has_core, has_shares.
# muns: published municipal shares (mun_code + the nine shares).
# Tracts with shares: all 13 indicators. Tracts with core indicators but no shares: core +
# pseudo-shares from the regression prior, shifted so that the no-share tracts of a municipality
# reproduce its published shares. Tracts without core indicators are not fitted (log-normal fallback).
# heldout: indicators removed from the targets (leave-one-share-out validation).
fit_gb2_full <- function(tr, muns, cfg_name = "bal", cores = 10, heldout = NULL) {
  cfg <- CONFIGS[[cfg_name]]; fam <- FAMILIES$gb2
  tr <- copy(tr); t0 <- Sys.time()
  core <- tr[has_core == TRUE]; nc <- nrow(core)
  T <- targets_for(core, cfg, caps_from = tr)
  if (!is.null(heldout)) T$obs[, heldout] <- NA                      # hold-out experiments
  sh_pub <- as.matrix(core[, ..SH])
  need <- which(!core$has_shares)
  train <- core[has_shares == TRUE & rowSums(T$cap[, c(1:4, 5:13)] != 0) == 0]
  pr <- fit_share_prior(train, core[need])
  pseudo <- pr$pred; psd <- matrix(pr$rmse, length(need), 9, byrow = TRUE)
  # municipal gap: no-share tracts of a municipality with published shares must reproduce them
  tr_all <- tr
  gap_groups <- core[need, .(i = need, mun_code, w)]
  muns_sh <- muns[!is.na(below_5000)]
  gap_muns <- intersect(unique(gap_groups$mun_code), muns_sh$mun_code)
  for (m in gap_muns) {
    g <- gap_groups[mun_code == m]; ii <- match(g$i, need)
    all_m <- tr_all[mun_code == m]
    known <- all_m[has_shares == TRUE]
    nocore <- all_m[has_core == FALSE]
    Wm <- sum(all_m$w); Sm <- unlist(muns_sh[mun_code == m, ..SH])
    num <- Wm * Sm - colSums(known$w * as.matrix(known[, ..SH]))
    if (nrow(nocore)) {                    # their fallback log-normal shares
      Fn <- pnorm(outer(-nocore$fb_mu, log(THR), "+") / nocore$fb_sigma)
      Fn[, IS_ABOVE] <- 1 - Fn[, IS_ABOVE]
      num <- num - colSums(nocore$w * 100 * Fn)
    }
    target <- num / sum(g$w)
    cur <- colSums(g$w * pseudo[ii, , drop = FALSE]) / sum(g$w)
    shift <- target - cur
    pseudo[ii, ] <- pmin(pmax(sweep(pseudo[ii, , drop = FALSE], 2, shift, "+"), 0), 100)
    psd[ii, ] <- sweep(psd[ii, , drop = FALSE], 2, 0.6, "*")      # group mean now exact; residual spread only
  }
  T$obs[need, SH] <- pseudo
  for (nm in c("sin_up", "sin_dn", "sout_up", "sout_dn")) T[[nm]][need, SH] <- sqrt(T[[nm]][need, SH]^2 + psd^2)
  T$cap[need, SH] <- 0L; T$h_up[need, SH] <- 0; T$h_dn[need, SH] <- 0
  fit <- fit_gb2(core, T, cores)
  P <- fam$unpack(pmin(pmax(fit$theta, matrix(fam$lo, nc, fam$k, byrow = TRUE)), matrix(fam$hi, nc, fam$k, byrow = TRUE)))
  list(tract_code = core$tract_code, theta = fit$theta, P = P, ssr = fit$ssr, iters = fit$iters,
       converged = fit$converged, which = fit$which, nev = fit$nev, T = T,
       prior_rmse = pr$rmse, n_prior_train = nrow(train), gap_muns = length(gap_muns),
       seconds = as.numeric(Sys.time() - t0, units = "secs"))
}

# ---- mixtures of tract distributions ------------------------------------------------------------
# d: one row per tract with dist ("gb2" / "lognormal"), a, lb, p, q (GB2) and mu, sigma (log-normal).
# Tract CDFs at log incomes lx (a vector, the same for every tract): n x length(lx).
tract_cdf <- function(d, lx) {
  Fm <- matrix(NA_real_, nrow(d), length(lx)); g <- d$dist == "gb2"
  if (any(g)) Fm[g, ] <- pbeta(plogis(outer(d$a[g], lx) - d$a[g] * d$lb[g]), d$p[g], d$q[g])
  if (any(!g)) Fm[!g, ] <- pnorm(outer(-d$mu[!g], lx, "+") / d$sigma[!g])
  Fm[, lx >= log(CAP_INC)] <- 1
  Fm
}
# Tract densities of income at x > 0 (closed form): n x length(x)
tract_pdf <- function(d, x) {
  lx <- log(x); D <- matrix(NA_real_, nrow(d), length(x)); g <- d$dist == "gb2"
  if (any(g)) {
    z <- outer(d$a[g], lx) - d$a[g] * d$lb[g]
    D[g, ] <- exp(log(d$a[g]) + d$p[g] * plogis(z, log.p = TRUE) + d$q[g] * plogis(-z, log.p = TRUE) -
                  lbeta(d$p[g], d$q[g]) - matrix(lx, sum(g), length(x), byrow = TRUE))
  }
  if (any(!g)) D[!g, ] <- dlnorm(matrix(x, sum(!g), length(x), byrow = TRUE), d$mu[!g], d$sigma[!g])
  D
}
# Percentiles of the population-weighted mixture of the tracts in d (weights w): Brent's method
# (uniroot), bracketed on a log grid.
mixture_quantiles <- function(d, w, probs = (1:99) / 100, grid = exp(seq(log(1), log(1e7), length.out = 241))) {
  w <- w / sum(w)
  Fg <- as.vector(crossprod(w, tract_cdf(d, log(grid))))
  f <- function(x, p) sum(w * tract_cdf(d, log(x))) - p
  vapply(probs, function(p) {
    i <- findInterval(p, Fg)
    if (i < 1 || i >= length(grid)) return(uniroot(f, c(1e-6, 1e8), p = p, tol = 1e-8)$root)
    if (Fg[i] == p) return(grid[i])
    uniroot(f, c(grid[i], grid[i + 1]), p = p, tol = 1e-8)$root
  }, 0)
}

