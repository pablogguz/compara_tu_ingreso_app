import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prototipos · Compara tu ingreso',
  robots: { index: false, follow: false },
}

// Three complete redesigns of the app, one per subfolder, to try side by
// side. Public but unlisted (not linked from the site, not indexed).
export default function PrototiposLayout({ children }: { children: React.ReactNode }) {
  return children
}
