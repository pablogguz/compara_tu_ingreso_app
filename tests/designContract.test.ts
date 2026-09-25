/**
 * Design-system contract.
 *
 * These tests do not render anything. They read the source tree and check the
 * invariants that keep the UI coherent:
 *
 *  1. Every plain-string class name a component uses (the help dialog, the
 *     cookie banner, the error fallback) is defined in one of the global
 *     stylesheets. The essay itself uses CSS modules.
 *  2. Typography is Fraunces + Hanken Grotesk everywhere — no stray Inter.
 *  3. Buttons are explicit about their type and use the shared .btn system.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

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
    for (const cls of ['active']) {
      expect(definedClasses.has(cls), `.${cls} missing from CSS`).toBe(true)
    }
  })

  it('the button system exposes the variants the components rely on', () => {
    for (const cls of ['btn', 'btn--primary', 'btn--secondary', 'btn--ghost', 'btn--sm', 'btn--xl', 'btn__icon', 'btn__spinner']) {
      expect(definedClasses.has(cls), `.${cls} missing from CSS`).toBe(true)
    }
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
