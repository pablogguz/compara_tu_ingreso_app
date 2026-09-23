import type { Metadata } from 'next'
import { Newsreader, Libre_Franklin } from 'next/font/google'

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-newsreader',
  display: 'swap',
  // next/font has no metrics for Newsreader to size a fallback with
  adjustFontFallback: false,
})

const franklin = Libre_Franklin({
  subsets: ['latin'],
  variable: '--font-franklin',
  display: 'swap',
})

export const metadata: Metadata = { title: 'Portada · prototipo · Compara tu ingreso' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${newsreader.variable} ${franklin.variable}`}>{children}</div>
}
