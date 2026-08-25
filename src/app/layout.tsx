import type { Metadata, Viewport } from 'next'
import { Fraunces, Hanken_Grotesk } from 'next/font/google'
import './globals.css'

// Typography — self-hosted through next/font so there is no runtime request
// to Google and no layout shift. The two families are exposed as CSS custom
// properties on <html>; public/css/styles.css builds --font-display and
// --font-ui on top of them (with plain fallbacks for environments where the
// variables are absent, e.g. tests).
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT', 'WONK'],
  variable: '--font-fraunces',
  display: 'swap',
})

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-hanken',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://comparatuingreso.es'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Compara tu ingreso',
  description: 'Compara tus ingresos con los del resto de hogares en España utilizando datos administrativos de declaraciones de IRPF',
  keywords: 'ingresos, distribución de ingresos, comparación de ingresos, España, IRPF, renta per cápita',
  authors: [{ name: 'Pablo García Guzmán' }],
  openGraph: {
    title: 'Compara tu ingreso',
    description: 'Compara tus ingresos con los del resto de hogares en España utilizando datos administrativos de declaraciones de IRPF',
    images: [
      {
        url: `${siteUrl}/card_media.png`,
        width: 1200,
        height: 630,
        alt: 'Compara tu ingreso',
      },
    ],
    type: 'website',
    siteName: 'Compara tu ingreso',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@pablogguz_',
    creator: '@pablogguz_',
    title: 'Compara tu ingreso',
    description: 'Compara tus ingresos con los del resto de hogares en España utilizando datos administrativos de declaraciones de IRPF',
    images: [`${siteUrl}/card_media.png`],
  },
}

export const viewport: Viewport = {
  themeColor: '#f7f9fc',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${fraunces.variable} ${hanken.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/distribution-icon.svg" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
        <link rel="stylesheet" href="/css/styles.css" />
        <link rel="stylesheet" href="/css/styles_results.css" />
        <link rel="stylesheet" href="/css/custom-components.css" />
        <link rel="stylesheet" href="/css/help-modal.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}
