'use client'

import { useMemo } from 'react'
import type { Level } from '../shared/useLevels'
import { curvePaths, resample, xAt, yAt } from '../shared/chart'
import { euro, outOf100 } from '../shared/format'
import s from './Articulo.module.css'

const W = 254
const H = 92

interface EscalasProps {
  levels: Level[]
  /** display names, one per level */
  names: string[]
  /** the place as it reads in a sentence, one per level */
  places: string[]
  income: number
  xmax: number
}

// Small multiples: the same household on the three distributions, on a common
// income axis and a common density scale (every curve has area 1), each with
// its median.
export default function Escalas({ levels, names, places, income, xmax }: EscalasProps) {
  const curves = useMemo(() => {
    const raw = levels.map((l) => (l.density.length > 1 ? resample(l.density, xmax, 91, 1) : new Array<number>(91).fill(0)))
    const peak = Math.max(...raw.flat(), 1e-12)
    return raw.map((r) => r.map((v) => v / peak))
  }, [levels, xmax])

  const split = Math.min(income, xmax)
  const ux = xAt(income, W, xmax)

  return (
    <ul className={s.scaleGrid}>
      {levels.map((level, i) => {
        const values = curves[i]
        const paths = curvePaths(values, W, H, { split, xmax })
        const mx = xAt(level.median, W, xmax)
        const my = yAt(values, level.median, H, { xmax })
        return (
          <li key={level.key} className={s.scale}>
            <div className={s.scaleHead}>
              <span className={s.scaleName}>{names[i]}</span>
              <span className={s.scaleValue}>
                <span className={s.srOnly}>percentil </span>
                {level.percentile}
              </span>
            </div>
            <svg className={s.scaleSvg} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
              <path className={s.scaleArea} d={paths.area} />
              <path className={s.scaleAreaDark} d={paths.left} />
              <path className={s.scaleCurve} d={paths.line} />
              <line className={s.scaleMedian} x1={mx} y1={my} x2={mx} y2={H} />
              <line className={s.scaleYou} x1={ux} y1={0} x2={ux} y2={H} />
              <line className={s.scaleAxis} x1={0} y1={H - 0.5} x2={W} y2={H - 0.5} />
            </svg>
            <p className={s.scaleNote}>
              <span className={s.scaleTick} aria-hidden="true" />
              Mediana {euro(level.median)}
            </p>
            <p className={s.srOnly}>{outOf100(level.percentile, places[i])}</p>
          </li>
        )
      })}
    </ul>
  )
}
