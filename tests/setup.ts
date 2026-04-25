import '@testing-library/jest-dom/vitest'

// jsdom does not implement matchMedia. Hooks/components that consult it for
// prefers-reduced-motion need a no-op stub so they don't crash under test.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// vitest 4 + happy-dom/jsdom can ship a non-standard localStorage shim. Force
// a fresh in-memory implementation so removeItem/setItem/getItem all work.
;(() => {
  const store = new Map<string, string>()
  const ls: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, String(value))
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: ls,
    writable: true,
    configurable: true,
  })
})()
