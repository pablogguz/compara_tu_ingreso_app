import type { Metadata } from 'next'

// Ensayo uses the site's own families (Fraunces + Hanken Grotesk), which the
// root layout already exposes as --font-fraunces / --font-hanken.
export const metadata: Metadata = { title: 'Ensayo · prototipo · Compara tu ingreso' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
