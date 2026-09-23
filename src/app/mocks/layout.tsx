import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Maquetas · Compara tu ingreso',
  robots: { index: false, follow: false },
}

// Design mocks: every screen bootable directly. Available locally and on
// Vercel preview deployments; the production deployment answers 404.
export default function MocksLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === 'production') notFound()
  return children
}
