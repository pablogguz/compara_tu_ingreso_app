import type { Metadata } from 'next'
import './globals.css'

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
        url: `${siteUrl}/card_teaser.png`,
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
    images: [`${siteUrl}/card_teaser.png`],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/svg+xml" href="/distribution-icon.svg" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
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
