import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'

const archivo = Archivo({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

export const metadata: Metadata = { title: 'Cien · prototipo · Compara tu ingreso' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={archivo.variable}>{children}</div>
}
