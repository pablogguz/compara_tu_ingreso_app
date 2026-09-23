'use client'

import type { ReactNode, Ref } from 'react'
import { barcodeWidths } from './copy'
import s from './App.module.css'

export const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ')

interface PageProps {
  /** the vertical strip: "Ejemplar para el interesado · …" */
  strip: string
  /** the same, short enough for one line on a phone */
  stripShort: string
  hideStripOnPhone?: boolean
  children: ReactNode
}

// The desk: the side strip and the sheet(s). Each page mounts its own, so the
// sheet is laid down again (sheetIn) whenever the page changes.
export function Page({ strip, stripShort, hideStripOnPhone, children }: PageProps) {
  return (
    <div className={s.desk}>
      <div className={cx(s.strip, hideStripOnPhone && s.stripHideOnPhone)} aria-hidden="true">
        <span className={s.stripText}>
          <span className={s.stripLong}>{strip}</span>
          <span className={s.stripShort}>{stripShort}</span>
        </span>
      </div>
      <div className={s.column}>{children}</div>
    </div>
  )
}

interface SheetHeaderProps {
  title: ReactNode
  titleId?: string
  titleRef?: Ref<HTMLHeadingElement>
  /** the line under the title on wide screens */
  sub?: ReactNode
  /** the line under the title on phones (defaults to `sub`) */
  phoneSub?: ReactNode
  aside?: ReactNode
  variant?: 'cover' | 'compact' | 'wide'
  largeTitle?: boolean
}

// "CTI | Declaración de la posición de renta del hogar | …"
export function SheetHeader({
  title,
  titleId,
  titleRef,
  sub,
  phoneSub,
  aside,
  variant = 'compact',
  largeTitle,
}: SheetHeaderProps) {
  return (
    <header
      className={cx(
        s.head,
        variant === 'cover' && s.headCover,
        variant === 'wide' && s.headWideAside,
        !aside && s.headNoAside
      )}
    >
      <div className={s.model}>
        {variant === 'cover' && <span className={s.modelWord}>Modelo</span>}
        <span className={s.modelCode}>CTI</span>
      </div>
      <div className={s.headTitle}>
        <h1 id={titleId} ref={titleRef} tabIndex={-1} className={cx(s.title, largeTitle && s.titleLarge)}>
          {title}
        </h1>
        {sub && <p className={s.headSub}>{sub}</p>}
        {(phoneSub ?? sub) && <p className={s.phoneSub}>{phoneSub ?? sub}</p>}
      </div>
      {aside && <div className={s.headAside}>{aside}</div>}
    </header>
  )
}

/** The dark number chip of a box: "01". */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx(s.chip, className)}>{children}</span>
}

/** A decorative barcode, derived from `code` (or from explicit widths). */
export function Barcode({
  code,
  widths,
  height = 54,
  unit = 2,
  className,
}: {
  code?: string
  widths?: number[]
  height?: number
  unit?: number
  className?: string
}) {
  const list = widths ?? barcodeWidths(code ?? '')
  // bars and spaces alternate, each followed by a hairline gap (as printed in
  // the mockups: flex items with a 2px gap)
  let x = 0
  const bars: Array<{ x: number; w: number }> = []
  list.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w: w * unit })
    x += w * unit + unit
  })
  const total = x - unit
  return (
    <svg
      className={cx(s.barcode, className)}
      width={total}
      height={height}
      viewBox={`0 0 ${total} ${height}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} />
      ))}
    </svg>
  )
}

export function ArrowIcon({ size = 20 }: { size?: number }) {
  return (
    <svg className={s.btnIcon} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function ScissorsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="6" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 7.5L21 18M8.5 16.5L21 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
