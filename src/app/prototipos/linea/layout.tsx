import type { Metadata } from 'next'
import { Overpass, Overpass_Mono } from 'next/font/google'

const overpass = Overpass({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-overpass',
  display: 'swap',
})

const overpassMono = Overpass_Mono({
  subsets: ['latin'],
  variable: '--font-overpass-mono',
  display: 'swap',
})

export const metadata: Metadata = { title: 'Línea · prototipo · Compara tu ingreso' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${overpass.variable} ${overpassMono.variable}`}>{children}</div>
}
