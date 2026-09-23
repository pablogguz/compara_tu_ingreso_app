# Prototypes

`ensayo/` is the chosen redesign (an academic explorable essay: the current look without the gloss, with scrollytelling from 100 squares to the income curve). It is not routed on the public site while it is being turned into the main app. The other directions (Portada, Formulario, Cien, Línea) were built, compared and dropped; they are in the git history.

Ensayo is self-contained: its `App.tsx` (the entry, a client component) plus its components and **CSS modules**, all inside its folder. It uses the site's own Fraunces + Hanken Grotesk from the root layout. It uses the real data and the real calculation, but never writes to the research sheet or loads analytics.

## Shared building blocks (`shared/`)

- **`useFlow()`**: answers, validation and the calculation.
  - `answers`: `{ municipality, monthlyIncome, paymentPeriods, adults, children, perceivedPercentile }`.
  - `set(key, value)`, `municipality` (the lookup row), `income` (validation: `state` is `empty | invalid | warning | valid`, plus `message`), `canCalculate`.
  - `annualIncome`, `units` (OECD consumption units), `equivIncome`.
  - `calculate()` (runs `computeResults`, with a minimum loading beat), `status` (`idle | calculating | done | error`), `results`, `error`, `reset()`.
  - `LIMITS` and `DEFAULT_ANSWERS` are exported alongside.
- **`useLevels(results, municipalityCode, perceivedPercentile)`**: everything a results screen needs for the three levels.
  - Returns `{ loading, error, levels, stats, guessValue }`. `levels` is national → provincial → municipal.
  - Each level has `{ key, label, place, percentile (1–99), rawPercentile, percentiles[99], density[{x,y}], median, p99, landmarks[P10,P25,Mediana,P75,P90,P99] }`.
  - `stats` holds the municipality figures (`net_income_equiv`, `pct_higher_ed_completed`, `pct_foreign_born`, with `*_is_imputed` flags meaning "media provincial"). `guessValue` is the income at the guessed percentile, nationally.
- **`<MunicipalitySearch>`**: an accessible combobox over all municipalities, headless (style it through the `classes` prop).
- **`format.ts`**:
  - Numbers: `euro()` ("38.400 €"), `num()`, `pct()` ("46,3 %"), `displayPercentile()`, `naturalName()` ("Rozas de Madrid, Las" → "Las Rozas de Madrid").
  - The shared sentences: `headline()`, `outOf100()`, `perceptionGap()`, `scaleExplained()` ("1 + 0,5 + 0,3 = 1,8 unidades de consumo"), `shareText()`.
- **`chart.ts`**: `resample()` a density onto 0…xmax, `curvePaths()` (smooth line, area, and the area up to a split income), `yAt()`, `xAt()`, `ticks()`.
- **`share.ts`**: `shareResult(text)` uses Web Share on phones and falls back to copying.

## Wording

The distributions are **population-weighted**: a percentile is the share of *people* living in households with a lower income per consumption unit. Say "más que el 86 % de la población" or "de cada 100 personas, 86…", not "de los hogares". The sentences in `format.ts` already do this.

## Rules

- Class names come only from CSS modules (`className={s.foo}`). No plain string class names, no Tailwind, no inline style objects except for data-driven values (a position, a width, a colour from data).
- Every `<button>` has a `type`. Real `<button>`, `<a>`, `<input>` and `<label>` elements; visible focus states; text contrast of at least 4.5:1.
- The site's global stylesheets still load on these routes (a reset, `a` colours, `body` background). Each prototype's root sets its own background, colour and font, covers the viewport, and restyles `a`.
- Mobile first: every screen works at 390 px wide.
