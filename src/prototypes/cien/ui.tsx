// Small shared pieces of the Cien prototype: class joining, the arrow and
// the constants every screen uses.

export const NOTE_URL = 'https://github.com/pablogguz/compara_tu_ingreso_validation/blob/main/tex/note.pdf'
export const CODE_URL = 'https://github.com/pablogguz/compara_tu_ingreso_validation'

/** Joins CSS-module class names, skipping falsy ones. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

/** 1…100 in reading order: 1 = top-left (least income), 100 = bottom-right. */
export const HUNDRED = Array.from({ length: 100 }, (_, i) => i + 1)

/** "02" */
export const pad2 = (n: number) => String(n).padStart(2, '0')

/** A CSS custom property for staggered animations (data-driven). */
export const stagger = (i: number): React.CSSProperties => ({ ['--i' as string]: i }) as React.CSSProperties

export function Arrow({ className, left = false }: { className?: string; left?: boolean }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <path
        d={left ? 'M23 13H5M12 6l-7 7 7 7' : 'M3 13h18M14 6l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="square"
      />
    </svg>
  )
}
