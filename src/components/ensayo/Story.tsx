'use client'

import { useEffect, useRef, useState } from 'react'
import type { Level } from '@/hooks/useLevels'
import { displayPercentile, euro, perceptionGap } from '@/lib/format'
import Figure, { STEP_KEYS, type StepKey } from './Figure'
import { XMAX, binText, countBelow, cx, levelPhrase, sentenceFor } from './copy'
import { peopleBelow } from './geometry'
import { useMediaQuery, useReducedMotion } from './hooks'
import a from './App.module.css'
import s from './Story.module.css'

interface StoryProps {
  levels: Level[]
  /** the raw national lookup (1…100) */
  rawNational: number
  guess: number
  income: number
  guessValue: number
}

const LAST = STEP_KEYS.length - 1

// Act II: one sticky figure, nine short steps scrolling past it. The step
// under a line across the viewport drives the figure (IntersectionObserver;
// where there is none, as in tests, the figure shows the final state).
export default function Story({ levels, rawNational, guess, income, guessValue }: StoryProps) {
  const compact = useMediaQuery('(max-width: 899px)')
  const reduced = useReducedMotion()
  const [active, setActive] = useState(() => (typeof IntersectionObserver === 'undefined' ? LAST : 0))
  const steps = useRef<Array<HTMLLIElement | null>>([])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setActive(LAST)
      return
    }
    const inView = new Set<number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.step)
          if (e.isIntersecting) inView.add(i)
          else inView.delete(i)
        }
        if (inView.size) setActive(Math.max(...Array.from(inView)))
      },
      // a thin line across the viewport: low on phones, where the text runs
      // under the figure; a little below the middle on wide screens
      { rootMargin: compact ? '-82% 0px -17% 0px' : '-56% 0px -43% 0px' }
    )
    steps.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [compact])

  const you = displayPercentile(rawNational)
  const gap = perceptionGap(rawNational, guess, 'tu hogar')
  const gapSentence = gap.sentence
  // how many of the hundred are below you: that many dark squares, yours is the next
  const below = peopleBelow(income, levels[0].percentiles)
  const copy = stepCopy({ levels, rawNational, you, below, guess, income, guessValue, gapSentence, diff: gap.diff, right: gap.kind === 'right' })
  const key: StepKey = STEP_KEYS[active]

  return (
    <section className={cx(a.flow, s.story)} aria-labelledby="ensayo-historia">
      <header className={s.head}>
        <div className={a.sectionHead}>
          <span className={a.secNum}>1</span>
          <h2 className={a.h2} id="ensayo-historia" tabIndex={-1}>
            Dónde estás, paso a paso
          </h2>
        </div>
        <p className={s.intro}>
          Baja despacio: la figura cambia con el texto.{' '}
          <a href="#resumen" className={s.skip}>
            Saltar al resumen ↓
          </a>
        </p>
      </header>

      <div className={cx(a.full, s.scrolly)}>
        <div className={s.sticky}>
          <div className={s.figureBox}>
            <Figure
              step={key}
              levels={levels}
              you={you}
              below={below}
              guess={guess}
              income={income}
              guessValue={guessValue}
              reduced={reduced}
              compact={compact}
              number="Figura 1"
            />
          </div>
          <p className={a.srOnly} aria-live="polite" aria-atomic="true">
            {describe(key, { levels, you, below, guess, income, guessValue })}
          </p>
        </div>

        <ol className={s.steps}>
          {copy.map((c, i) => (
            <li
              key={c.key}
              ref={(el) => {
                steps.current[i] = el
              }}
              data-step={i}
              className={cx(s.step, i === active && s.stepActive)}
            >
              <div className={s.card}>
                <p className={s.stepNum} aria-hidden="true">
                  {i + 1} / {copy.length}
                </p>
                <h3 className={s.stepTitle}>{c.title}</h3>
                {c.body.map((b, j) => (
                  <p key={j} className={cx(s.stepText, j > 0 && s.stepMore)}>
                    {b}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

interface CopyInput {
  levels: Level[]
  rawNational: number
  you: number
  below: number
  guess: number
  income: number
  guessValue: number
  gapSentence: string
  diff: number
  right: boolean
}

interface StepCopy {
  key: StepKey
  title: React.ReactNode
  body: React.ReactNode[]
}

function stepCopy({ levels, rawNational, you, below, guess, income, guessValue, gapSentence, diff, right }: CopyInput): StepCopy[] {
  const [national, provincial, municipal] = levels
  const left =
    rawNational < 1
      ? 'Casi toda la población queda a tu derecha.'
      : rawNational >= 100
        ? 'Más del 99 % de la población queda a tu izquierda.'
        : `El ${you} % de la población queda a tu izquierda.`
  const beyond = income > XMAX
  const provPlace = levelPhrase('provincial', provincial.place)
  const munPlace = levelPhrase('municipal', municipal.place)

  return [
    {
      key: 'people',
      title: 'Imagina que España fuera cien personas.',
      body: [
        'Cada cuadrado es una de ellas. En realidad, cada uno representa a un 1 % de la población: casi medio millón de personas.',
      ],
    },
    {
      key: 'order',
      title: 'Ahora las ordenamos según sus ingresos, de menos a más.',
      body: ['Arriba a la izquierda está la persona con menos ingresos. Abajo a la derecha, la que tiene más.'],
    },
    {
      key: 'guess',
      title: (
        <>
          Antes dijiste que creías tener a <span className={s.guessNum}>{guess}</span>{' '}
          {guess === 1 ? 'persona' : 'personas'} por debajo.
        </>
      ),
      body: [
        `Es el cuadrado del borde discontinuo, con ${guess} ${guess === 1 ? 'cuadrado' : 'cuadrados'} antes que él. Veamos dónde estás en realidad.`,
      ],
    },
    {
      key: 'you',
      title:
        below === 0 ? (
          'En realidad, estás al principio de la fila.'
        ) : (
          <>
            {diff === 0 ? 'Y así es: tienes a ' : right ? 'Casi: tienes a ' : 'En realidad, tienes a '}
            <span className={s.youNum}>{below}</span> {below === 1 ? 'persona' : 'personas'} por debajo.
          </>
        ),
      body: [
        rawNational < 1
          ? 'Estás entre el 1 % de la población con menos ingresos. Tú eres el cuadrado azul.'
          : you === 1
            ? '1 de cada 100 personas tiene menos ingresos que tú. Tú eres el cuadrado azul.'
            : `${you} de cada 100 personas tienen menos ingresos que tú. Tú eres el cuadrado azul.`,
        gapSentence,
      ],
    },
    {
      key: 'hist',
      title: 'Cada una de esas personas tiene una renta.',
      body: [
        'Si colocamos a cada una sobre la suya, en tramos de 5.000 €, se apilan así: muchas a la izquierda y unas pocas, muy lejos, a la derecha.',
        `Tu cuadrado cae en el tramo ${binText(income)}.`,
      ],
    },
    {
      key: 'curve',
      title: 'Con toda la población, los escalones se suavizan.',
      body: [
        'Con millones de personas en lugar de cien, el histograma se convierte en una curva: la distribución de la renta en España.',
        `La línea de puntos es la mediana. La mitad de la población está por debajo de ${euro(national.median)}.`,
      ],
    },
    {
      key: 'lines',
      title: right ? 'Creías estar aquí, y estás justo ahí.' : 'Tú creías estar aquí… y estás aquí.',
      body: [
        `Donde creías estar, con ${guess} ${guess === 1 ? 'persona' : 'personas'} por debajo, la renta es de unos ${euro(guessValue)}. La de tu hogar es de ${euro(income)}${beyond ? ', más allá del borde del gráfico' : ''}.`,
        left,
      ],
    },
    {
      key: 'province',
      title: 'El mismo ingreso, en otro lugar.',
      body: [
        `${sentenceFor(provincial.rawPercentile, provPlace)}`,
        'Tu renta no cambia: cambia con quién te comparas. La línea discontinua gris es la curva de España.',
      ],
    },
    {
      key: 'municipality',
      title: `Y en ${munPlace}…`,
      body: [
        sentenceFor(municipal.rawPercentile, munPlace),
        `En España quedaban ${countBelow(rawNational)} de cada 100 por debajo de ti. En ${provPlace}, ${countBelow(provincial.rawPercentile)}. Aquí, ${countBelow(municipal.rawPercentile)}.`,
      ],
    },
  ]
}

/** What the figure shows, for screen readers. */
function describe(
  key: StepKey,
  {
    levels,
    you,
    below,
    guess,
    income,
    guessValue,
  }: { levels: Level[]; you: number; below: number; guess: number; income: number; guessValue: number }
): string {
  switch (key) {
    case 'people':
      return 'Figura: cien cuadrados grises en una cuadrícula de diez por diez. España reducida a cien personas.'
    case 'order':
      return 'Figura: los cuadrados se tiñen de claro a oscuro, de la persona con menos ingresos, arriba a la izquierda, a la que más, abajo a la derecha.'
    case 'guess':
      return `Figura: tu estimación, el cuadrado con ${guess} antes que él, aparece con un borde discontinuo.`
    case 'you':
      return below === 0
        ? 'Figura: tu cuadrado, en azul, es el primero de la cuadrícula. Nadie de los cien tiene menos ingresos que tú.'
        : `Figura: tu cuadrado, en azul, con ${below} cuadrados más oscuros antes que él, personas con menos ingresos que tú. Los ${99 - below} restantes, más claros, tienen más.`
    case 'hist':
      return `Figura: los cien cuadrados se apilan según su renta en tramos de 5.000 €, formando un histograma. El tuyo está en el tramo ${binText(income)}.`
    case 'curve':
      return `Figura: sobre el histograma se dibuja una curva suave, la distribución de la renta en España. La mediana está en ${euro(levels[0].median)}.`
    case 'lines':
      return `Figura: una línea discontinua marca tu predicción, ${euro(guessValue)}, y una línea azul la renta de tu hogar, ${euro(income)}. A la izquierda de la línea azul queda el ${you} % de la población.`
    case 'province':
      return `Figura: la curva pasa a ser la de la provincia de ${levels[1].place}. Allí quedan ${countBelow(levels[1].rawPercentile)} de cada 100 por debajo de ti.`
    case 'municipality':
      return `Figura: la curva pasa a ser la del municipio de ${levels[2].place}. Allí quedan ${countBelow(levels[2].rawPercentile)} de cada 100 por debajo de ti.`
  }
}
