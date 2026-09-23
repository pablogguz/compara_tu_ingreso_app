import { describe, it, expect } from 'vitest'
import { SCENARIOS, MOCK_GROUPS, findScenario } from '@/components/mocks/scenarios'
import { HELP_TABS } from '@/components/HelpModal'

describe('/mocks scenarios', () => {
  it('have unique, URL-safe ids', () => {
    const ids = SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
  })

  it('cover every group and every stage of the app', () => {
    for (const g of MOCK_GROUPS) expect(SCENARIOS.some((s) => s.group === g)).toBe(true)
    const stages = new Set(SCENARIOS.map((s) => s.boot.stage))
    expect(stages).toEqual(new Set(['landing', 'questions', 'loading', 'results']))
    for (const step of [1, 2, 3, 4]) {
      expect(SCENARIOS.some((s) => s.boot.questions?.step === step)).toBe(true)
    }
  })

  it('results screens carry the answers to compute them from', () => {
    for (const s of SCENARIOS.filter((x) => x.boot.stage === 'results')) {
      expect(s.answers, s.id).toBeDefined()
      expect(s.answers!.municipality).toMatch(/^\d{5}$/)
      expect(s.answers!.perceivedPercentile).toBeGreaterThanOrEqual(1)
      expect(s.answers!.perceivedPercentile).toBeLessThanOrEqual(99)
    }
  })

  it('open the help modal only on tabs that exist', () => {
    const tabs = HELP_TABS.map((t) => t.id)
    for (const s of SCENARIOS.filter((x) => x.boot.helpTab)) {
      expect(tabs).toContain(s.boot.helpTab)
    }
  })

  it('findScenario looks up by id', () => {
    expect(findScenario('resultados')?.group).toBe('Resultados')
    expect(findScenario('nope')).toBeUndefined()
  })
})
