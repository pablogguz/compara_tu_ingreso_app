import type { Metadata } from 'next'
import { IBM_Plex_Sans_Condensed, IBM_Plex_Mono, Courier_Prime } from 'next/font/google'

const plexCondensed = IBM_Plex_Sans_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-plex-condensed',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
})

// the "typewritten" values the user fills in
const courier = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-courier',
  display: 'swap',
})

export const metadata: Metadata = { title: 'Formulario · prototipo · Compara tu ingreso' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${plexCondensed.variable} ${plexMono.variable} ${courier.variable}`}>{children}</div>
  )
}
