import type { AppBoot } from '@/components/App'
import type { ResultsQuery } from '@/lib/computeResults'

// Every screen of the app, bootable directly at /mocks/<id>/ — no need to walk
// the questionnaire to check a state. Results scenarios compute their numbers
// from the real Arrow data (same math as the live flow), so what you see is
// what a user with those answers would see.

export type MockGroup = 'Inicio' | 'Cuestionario' | 'Resultados' | 'Capas'

export interface MockScenario {
  id: string
  group: MockGroup
  title: string
  description: string
  boot: AppBoot
  /** Results scenarios: the answers to compute from real data. */
  answers?: ResultsQuery & { perceivedPercentile: number }
}

export const MOCK_GROUPS: MockGroup[] = ['Inicio', 'Cuestionario', 'Resultados', 'Capas']

const MADRID = '28079'
const madrid = { municipality: MADRID }

// A single adult in Madrid on 3.200 €/month, who guessed the 62nd percentile.
const MADRID_ANSWERS = {
  municipality: MADRID,
  monthlyIncome: 3200,
  paymentPeriods: 12 as const,
  adults: 1,
  children: 0,
  perceivedPercentile: 62,
}

export const SCENARIOS: MockScenario[] = [
  // ---- Inicio ---------------------------------------------------------------
  {
    id: 'inicio',
    group: 'Inicio',
    title: 'Portada',
    description: 'Título, curva de fondo y botón de inicio.',
    boot: { stage: 'landing' },
  },
  {
    id: 'inicio-cookies',
    group: 'Inicio',
    title: 'Portada + cookies',
    description: 'La portada con el aviso de cookies (sin guardar la elección).',
    boot: { stage: 'landing', cookiePreview: true },
  },

  // ---- Cuestionario -----------------------------------------------------------
  {
    id: 'municipio',
    group: 'Cuestionario',
    title: '1 · Municipio (vacío)',
    description: 'Primer paso sin respuesta: el botón sigue desactivado.',
    boot: { stage: 'questions', questions: { step: 1 } },
  },
  {
    id: 'municipio-elegido',
    group: 'Cuestionario',
    title: '1 · Municipio elegido',
    description: 'Madrid seleccionado; abre el desplegable para ver el menú.',
    boot: { stage: 'questions', questions: { step: 1, ...madrid } },
  },
  {
    id: 'ingresos',
    group: 'Cuestionario',
    title: '2 · Ingresos (vacío)',
    description: 'El campo de ingresos vacío: el botón sigue desactivado.',
    boot: { stage: 'questions', questions: { step: 2, ...madrid } },
  },
  {
    id: 'ingresos-rellenos',
    group: 'Cuestionario',
    title: '2 · Ingresos rellenos',
    description: '3.200 € al mes en 12 pagas, con el total anual.',
    boot: { stage: 'questions', questions: { step: 2, ...madrid, monthlyIncome: 3200 } },
  },
  {
    id: 'ingresos-14-pagas',
    group: 'Cuestionario',
    title: '2 · 14 pagas',
    description: '2.400 € en 14 pagas: el interruptor en su otra posición.',
    boot: {
      stage: 'questions',
      questions: { step: 2, ...madrid, monthlyIncome: 2400, paymentPeriods: 14 },
    },
  },
  {
    id: 'ingresos-aviso',
    group: 'Cuestionario',
    title: '2 · Aviso (¿anual?)',
    description: '20.000 € al mes: aviso de que la cifra debe ser mensual.',
    boot: { stage: 'questions', questions: { step: 2, ...madrid, monthlyIncome: 20000 } },
  },
  {
    id: 'ingresos-error',
    group: 'Cuestionario',
    title: '2 · Error de rango',
    description: '60.000 € al mes: fuera de rango, no deja avanzar.',
    boot: { stage: 'questions', questions: { step: 2, ...madrid, monthlyIncome: 60000 } },
  },
  {
    id: 'hogar',
    group: 'Cuestionario',
    title: '3 · Hogar',
    description: 'Dos adultos y un menor.',
    boot: {
      stage: 'questions',
      questions: { step: 3, ...madrid, monthlyIncome: 3200, adults: 2, children: 1 },
    },
  },
  {
    id: 'hogar-numeroso',
    group: 'Cuestionario',
    title: '3 · Hogar numeroso',
    description: '4 adultos y 10 menores: números de dos cifras en los selectores.',
    boot: {
      stage: 'questions',
      questions: { step: 3, ...madrid, monthlyIncome: 3200, adults: 4, children: 10 },
    },
  },
  {
    id: 'percepcion',
    group: 'Cuestionario',
    title: '4 · Percepción',
    description: 'El deslizador en el percentil 62.',
    boot: {
      stage: 'questions',
      questions: { step: 4, ...madrid, monthlyIncome: 3200, perceivedPercentile: 62 },
    },
  },
  {
    id: 'cargando',
    group: 'Cuestionario',
    title: 'Calculando',
    description: 'La pantalla de carga, detenida (en la app dura ~1 s).',
    boot: { stage: 'loading' },
  },

  // ---- Resultados ---------------------------------------------------------------
  {
    id: 'resultados',
    group: 'Resultados',
    title: 'Resultado · nacional',
    description: 'Madrid, 3.200 €/mes, un adulto; creía estar en el 62.',
    boot: { stage: 'results' },
    answers: MADRID_ANSWERS,
  },
  {
    id: 'resultados-provincial',
    group: 'Resultados',
    title: 'Resultado · provincial',
    description: 'Mismo hogar, vista provincial (sin línea de predicción).',
    boot: { stage: 'results', resultsView: 'provincial' },
    answers: MADRID_ANSWERS,
  },
  {
    id: 'resultados-municipal',
    group: 'Resultados',
    title: 'Resultado · municipal',
    description: 'Mismo hogar, comparado solo con Madrid.',
    boot: { stage: 'results', resultsView: 'municipal' },
    answers: MADRID_ANSWERS,
  },
  {
    id: 'resultados-bajo',
    group: 'Resultados',
    title: 'Resultado · renta baja',
    description: 'Sevilla, 900 €/mes, 2 adultos y 2 menores; creía estar en el 40.',
    boot: { stage: 'results' },
    answers: {
      municipality: '41091',
      monthlyIncome: 900,
      paymentPeriods: 12,
      adults: 2,
      children: 2,
      perceivedPercentile: 40,
    },
  },
  {
    id: 'resultados-alto',
    group: 'Resultados',
    title: 'Resultado · por encima del 99',
    description: 'Barcelona, 14.000 €/mes, un adulto: el máximo mostrado (99).',
    boot: { stage: 'results' },
    answers: {
      municipality: '08019',
      monthlyIncome: 14000,
      paymentPeriods: 14,
      adults: 1,
      children: 0,
      perceivedPercentile: 85,
    },
  },
  {
    id: 'resultados-nombre-largo',
    group: 'Resultados',
    title: 'Resultado · nombre largo',
    description: 'Madrigal de las Altas Torres: el titular y la ficha con un nombre largo.',
    boot: { stage: 'results', resultsView: 'municipal' },
    answers: {
      municipality: '05114',
      monthlyIncome: 1900,
      paymentPeriods: 14,
      adults: 2,
      children: 0,
      perceivedPercentile: 50,
    },
  },

  // ---- Capas ----------------------------------------------------------------------
  {
    id: 'ayuda',
    group: 'Capas',
    title: 'Ayuda · Datos',
    description: 'El modal de ayuda abierto sobre los resultados.',
    boot: { stage: 'results', helpOpen: true, helpTab: 'datos' },
    answers: MADRID_ANSWERS,
  },
  {
    id: 'ayuda-metodologia',
    group: 'Capas',
    title: 'Ayuda · Metodología',
    description: 'La pestaña de metodología, sobre el cuestionario.',
    boot: {
      stage: 'questions',
      questions: { step: 2, ...madrid, monthlyIncome: 3200 },
      helpOpen: true,
      helpTab: 'metodologia',
    },
  },
]

export function findScenario(id: string): MockScenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
