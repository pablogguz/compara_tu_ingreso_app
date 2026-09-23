// The three lines of the network and the small bits of copy the screens share.

import type { Level, LevelKey } from '../shared/useLevels'
import { num, outOf100 } from '../shared/format'

export interface LineMeta {
  code: 'L1' | 'L2' | 'L3'
  /** full colour: the stretch of the line already travelled */
  color: string
  /** tint: the stretch still ahead */
  tint: string
}

export const LINES: Record<LevelKey, LineMeta> = {
  national: { code: 'L1', color: '#B24E0E', tint: '#EFC9AE' },
  provincial: { code: 'L2', color: '#245FB8', tint: '#BFD1EF' },
  municipal: { code: 'L3', color: '#17704A', tint: '#B5D8C6' },
}

/** Position of a stop (1…99) along a line, 0…1. */
export function stopPosition(p: number): number {
  return (Math.min(99, Math.max(1, p)) - 1) / 98
}

/** "1 adulto", "2 adultos y 1 niño" */
export function travellers(adults: number, children: number): string {
  const a = `${adults} ${adults === 1 ? 'adulto' : 'adultos'}`
  if (!children) return a
  return `${a} y ${children} ${children === 1 ? 'niño' : 'niños'}`
}

/** 1 → "1 unidad", 1.8 → "1,8 unidades" */
export function unitsShort(units: number): string {
  const whole = Math.abs(units - Math.round(units)) < 1e-9
  if (whole && Math.round(units) === 1) return '1 unidad'
  return `${num(units, whole ? 0 : 1)} unidades`
}

/** How a level reads inside a sentence: "España", "la provincia de Madrid", "Madrid". */
export function sentencePlace(level: Level): string {
  return level.key === 'provincial' ? `la provincia de ${level.place}` : level.place
}

/** The shared "de cada 100 personas…" sentence for a level. */
export function perHundred(level: Level): string {
  return outOf100(level.percentile, sentencePlace(level))
}

/** "Tu hogar ingresa…" → "tu hogar ingresa…" */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/** Joins class names, skipping falsy ones. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

export const NOTE_URL = 'https://github.com/pablogguz/compara_tu_ingreso_validation/blob/main/tex/note.pdf'
export const CODE_URL = 'https://github.com/pablogguz/compara_tu_ingreso_validation'
