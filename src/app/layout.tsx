import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Compara tu ingreso',
  description: 'Compara tus ingresos con los del resto de hogares en España utilizando datos administrativos de declaraciones de IRPF',
  keywords: 'ingresos, distribución de ingresos, comparación de ingresos, España, IRPF, renta per cápita',
  authors: [{ name: 'Pablo García Guzmán' }],
  openGraph: {
    title: 'Compara tu ingreso',
    description: 'Compara tus ingresos con los del resto de hogares en España utilizando datos administrativos de declaraciones de IRPF',
    images: ['/card_teaser.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@pablogguz_',
    title: 'Compara tu ingreso',
    description: 'Compara tus ingresos con los del resto de hogares en España utilizando datos administrativos de declaraciones de IRPF',
    images: ['/card_teaser.png'],
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
