'use client'

export type ShareOutcome = 'shared' | 'copied' | 'failed'

/** Web Share where available (phones), otherwise copy text + link to the clipboard. */
export async function shareResult(text: string, url = 'https://comparatuingreso.es'): Promise<ShareOutcome> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ text, url })
      return 'shared'
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
