// What the form checks before it can be presented, box by box, in the order
// the boxes are printed. App uses it to move focus to the first gap; the form
// uses it for the red borders, the notes under the boxes and the summary.
import type { Flow } from '../shared/useFlow'
import { LIMITS } from '../shared/useFlow'
import { missingSummary } from './copy'

/** The typed boxes that hold text the flow can't (a blank, an out-of-range value). */
export interface Draft {
  adults: string
  children: string
  /** box 06 as typed; '' until the user declares a guess */
  guess: string
  declared: boolean
  /** "Presentar" was pressed with something missing: show every note */
  attempted: boolean
}

export const INITIAL_DRAFT: Draft = { adults: '1', children: '0', guess: '', declared: false, attempted: false }

export type BoxKey = '01' | '02' | '04' | '05' | '06' | 'decl'

/** The id of each box's control, to focus it and to hang its note from. */
export const FIELD_ID: Record<BoxKey, string> = {
  '01': 'cti-c01',
  '02': 'cti-c02',
  '04': 'cti-c04',
  '05': 'cti-c05',
  '06': 'cti-c06',
  decl: 'cti-decl',
}

export const noteId = (box: BoxKey) => `${FIELD_ID[box]}-nota`

export interface Problem {
  box: BoxKey
  kind: 'missing' | 'invalid'
  message: string
}

/** A whole number within [min, max], or null. */
export function intIn(text: string, min: number, max: number): number | null {
  if (!/^\d{1,3}$/.test(text.trim())) return null
  const n = Number(text)
  return n >= min && n <= max ? n : null
}

export function problems(flow: Flow, draft: Draft): Problem[] {
  const out: Problem[] = []
  if (!flow.municipality) {
    out.push({ box: '01', kind: 'missing', message: 'Casilla 01: escriba y elija su municipio en la lista.' })
  }
  if (flow.income.state === 'empty') {
    out.push({ box: '02', kind: 'missing', message: 'Casilla 02: consigne los ingresos netos mensuales del hogar.' })
  } else if (flow.income.state === 'invalid') {
    out.push({ box: '02', kind: 'invalid', message: 'Casilla 02: consigne un importe entre 1 y 50.000 € al mes.' })
  }
  if (draft.adults.trim() === '') {
    out.push({ box: '04', kind: 'missing', message: 'Casilla 04: al menos una persona, usted.' })
  } else if (intIn(draft.adults, LIMITS.adults.min, LIMITS.adults.max) === null) {
    out.push({ box: '04', kind: 'invalid', message: 'Casilla 04: entre 1 y 20 personas, usted incluido.' })
  }
  if (draft.children.trim() !== '' && intIn(draft.children, LIMITS.children.min, LIMITS.children.max) === null) {
    out.push({ box: '05', kind: 'invalid', message: 'Casilla 05: entre 0 y 20 menores.' })
  }
  if (draft.guess.trim() === '') {
    out.push({ box: '06', kind: 'missing', message: 'Casilla 06: marque su estimación en la regla o escríbala.' })
  } else if (intIn(draft.guess, LIMITS.perceived.min, LIMITS.perceived.max) === null) {
    out.push({ box: '06', kind: 'invalid', message: 'Casilla 06: consigne un número entre 1 y 99.' })
  }
  if (!draft.declared) {
    out.push({ box: 'decl', kind: 'missing', message: 'Marque la declaración para poder presentarla.' })
  }
  return out
}

/** "Faltan las casillas 01 y 06 y la declaración." */
export function summary(list: Problem[]): string {
  const boxes = (kind: Problem['kind']) => list.filter((p) => p.kind === kind && p.box !== 'decl').map((p) => p.box)
  return missingSummary(boxes('missing'), boxes('invalid'), !list.some((p) => p.box === 'decl'))
}
