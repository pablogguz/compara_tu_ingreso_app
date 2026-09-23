/**
 * Design-system contract.
 *
 * These tests do not render anything. They read the source tree and check the
 * invariants that keep the UI coherent:
 *
 *  1. Every class name a component uses is defined in one of the stylesheets
 *     (catches typos and orphaned classes after a CSS refactor).
 *  2. src/lib/charts/theme.ts mirrors the :root tokens in styles.css.
 *  3. Typography is Fraunces + Hanken Grotesk everywhere — no stray Inter.
 *  4. Buttons are explicit about their type and use the shared .btn system.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { chartTheme } from '@/lib/charts/theme'

const ROOT = path.resolve(__dirname, '..')
const CSS_DIR = path.join(ROOT, 'public', 'css')
const SRC_DIR = path.join(ROOT, 'src')

const CSS_FILES = ['styles.css', 'styles_results.css', 'custom-components.css', 'help-modal.css']
const css = CSS_FILES.map((f) => fs.readFileSync(path.join(CSS_DIR, f), 'utf8')).join('\n')

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(p, exts))
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(p)
  }
  return out
}

const componentFiles = walk(SRC_DIR, ['.tsx'])
const sourceFiles = walk(SRC_DIR, ['.ts', '.tsx'])

// ---- class names used in JSX ------------------------------------------------
function classNamesIn(source: string): string[] {
  const tokens: string[] = []
  const re = /className=\{?\s*(["'`])([\s\S]*?)\1/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    const cleaned = m[2].replace(/\$\{[\s\S]*?\}/g, ' ')
    tokens.push(...cleaned.split(/\s+/))
  }
  return tokens
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !/^fa[srb]?$/.test(t) && !t.startsWith('fa-')) // Font Awesome
    .filter((t) => !t.endsWith('-')) // partial modifier before a ${}
    .filter((t) => !['true', 'false', '?', ':', '==='].includes(t))
}

const definedClasses = new Set(
  Array.from(css.matchAll(/\.([A-Za-z_][\w-]*)/g)).map((m) => m[1])
)

// ---- :root tokens -----------------------------------------------------------
function rootTokens(): Record<string, string> {
  const styles = fs.readFileSync(path.join(CSS_DIR, 'styles.css'), 'utf8')
  const start = styles.indexOf(':root {')
  const end = styles.indexOf('\n}', start)
  const block = styles.slice(start, end)
  const tokens: Record<string, string> = {}
  for (const m of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens[m[1]] = m[2].replace(/\s+/g, ' ').trim()
  }
  return tokens
}

describe('CSS ↔ component contract', () => {
  it('every class used by a component is defined in a stylesheet', () => {
    const orphans: string[] = []
    for (const file of componentFiles) {
      const source = fs.readFileSync(file, 'utf8')
      for (const cls of classNamesIn(source)) {
        if (!definedClasses.has(cls)) orphans.push(`${path.relative(ROOT, file)} → .${cls}`)
      }
    }
    expect(orphans).toEqual([])
  })

  it('dynamic modifier classes built at runtime exist too', () => {
    for (const cls of [
      'stat-card--income',
      'stat-card--education',
      'stat-card--foreign',
      'pagas-toggle--14',
      'is-active',
      'active',
      'invalid',
      'field-message--error',
      'field-message--warning',
      'is-collapsed',
    ]) {
      expect(definedClasses.has(cls), `.${cls} missing from CSS`).toBe(true)
    }
  })

  it('the button system exposes the variants the components rely on', () => {
    for (const cls of ['btn', 'btn--primary', 'btn--secondary', 'btn--ghost', 'btn--sm', 'btn--xl', 'btn__icon', 'btn__spinner']) {
      expect(definedClasses.has(cls), `.${cls} missing from CSS`).toBe(true)
    }
  })
})

describe('theme.ts mirrors styles.css tokens', () => {
  const tokens = rootTokens()

  it('parses the :root block', () => {
    expect(Object.keys(tokens).length).toBeGreaterThan(20)
  })

  it.each([
    ['primary', '--primary'],
    ['primaryDeep', '--chart-position'],
    ['prediction', '--chart-prediction'],
    ['grid', '--chart-grid'],
    ['areaTop', '--chart-area-top'],
    ['areaBottom', '--chart-area-bottom'],
    ['areaDimTop', '--chart-area-dim-top'],
    ['areaDimBottom', '--chart-area-dim-bottom'],
    ['areaDimLine', '--chart-area-dim-line'],
    ['areaLine', '--primary'],
    ['text', '--foreground'],
    ['textMuted', '--muted-foreground'],
    ['axisLine', '--border'],
  ] as const)('chartTheme.%s === %s', (key, token) => {
    expect(chartTheme[key]).toBe(tokens[token])
  })

  it.each([
    ['motionFast', '--motion-fast'],
    ['motionBase', '--motion-base'],
    ['motionSlow', '--motion-slow'],
  ] as const)('chartTheme.%s === %s (ms)', (key, token) => {
    expect(chartTheme[key]).toBe(parseInt(tokens[token], 10))
  })

  it('font stacks agree on the UI family', () => {
    expect(tokens['--font-ui']).toMatch(/Hanken Grotesk/)
    expect(tokens['--font-display']).toMatch(/Fraunces/)
    expect(chartTheme.fontFamily).toMatch(/Hanken Grotesk/)
  })
})

describe('typography', () => {
  it('Inter is gone from stylesheets and source', () => {
    const offenders: string[] = []
    for (const f of CSS_FILES) {
      if (/['"]Inter['"]/.test(fs.readFileSync(path.join(CSS_DIR, f), 'utf8'))) offenders.push(f)
    }
    for (const f of sourceFiles) {
      if (/['"]Inter['"]/.test(fs.readFileSync(f, 'utf8'))) offenders.push(path.relative(ROOT, f))
    }
    expect(offenders).toEqual([])
  })

  it('fonts are self-hosted through next/font in the root layout', () => {
    const layout = fs.readFileSync(path.join(SRC_DIR, 'app', 'layout.tsx'), 'utf8')
    expect(layout).toMatch(/from 'next\/font\/google'/)
    expect(layout).toMatch(/Fraunces\(/)
    expect(layout).toMatch(/Hanken_Grotesk\(/)
    expect(layout).toMatch(/--font-fraunces/)
    expect(layout).toMatch(/--font-hanken/)
    expect(layout).not.toMatch(/fonts\.googleapis\.com/)
  })
})

describe('buttons', () => {
  it('every <button> declares an explicit type', () => {
    const offenders: string[] = []
    for (const file of componentFiles) {
      const source = fs.readFileSync(file, 'utf8')
      for (const m of source.matchAll(/<button\b([^>]*)>/g)) {
        if (!/\btype=/.test(m[1])) offenders.push(`${path.relative(ROOT, file)}: <button${m[1].slice(0, 40)}…`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('no component still uses the retired button classes', () => {
    const retired = ['btn-nav', 'next-btn', 'prev-btn', 'calculate-btn', 'btn-primary', 'btn-secondary', 'start-button', 'cookie-btn', 'btn-recalculate', 'nav-button']
    const offenders: string[] = []
    for (const file of componentFiles) {
      const source = fs.readFileSync(file, 'utf8')
      for (const cls of classNamesIn(source)) {
        if (retired.includes(cls)) offenders.push(`${path.relative(ROOT, file)} → .${cls}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
