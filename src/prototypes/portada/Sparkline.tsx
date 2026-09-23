'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadNationalDensity } from '@/lib/dataLoader'
import { curvePaths, resample } from '../shared/chart'
import s from './Frase.module.css'

const XMAX = 90000
const W = 360
const H = 120

// The national distribution, small, in the "Cómo lo calculamos" column of the
// front page. Real data: the same curve the results chart draws.
export default function Sparkline() {
  const [density, setDensity] = useState<Array<{ x: number; y: number }> | null>(null)

  useEffect(() => {
    let cancelled = false
    loadNationalDensity()
      .then((d) => {
        if (!cancelled) setDensity(d)
      })
      .catch(() => {
        // the column reads fine without the drawing
      })
    return () => {
      cancelled = true
    }
  }, [])

  const paths = useMemo(
    () => (density && density.length > 1 ? curvePaths(resample(density, XMAX, 121), W, H, { xmax: XMAX }) : null),
    [density]
  )

  return (
    <svg
      className={s.sparkSvg}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Curva del reparto de la renta en España: mucha población en rentas bajas y medias y una cola larga hacia las rentas altas."
    >
      {paths && (
        <g className={s.sparkDraw}>
          <path className={s.sparkArea} d={paths.area} />
          <path className={s.sparkLine} d={paths.line} vectorEffect="non-scaling-stroke" />
        </g>
      )}
      <line className={s.sparkBase} x1={0} y1={H - 0.5} x2={W} y2={H - 0.5} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
