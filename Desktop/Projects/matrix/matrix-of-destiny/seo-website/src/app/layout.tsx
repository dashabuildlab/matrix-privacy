import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://yourmatrixofdestiny.com'),
  title: {
    default: 'Матриця Долі онлайн — безкоштовний розрахунок ✦ Matrix of Destiny',
    template: '%s | Matrix of Destiny',
  },
  description: 'Розрахуй свою Матрицю Долі безкоштовно за датою народження. 22 енергії, карма, таланти і призначення. Глибокий AI-аналіз. Понад 50 000 розрахунків.',
  keywords: ['матриця долі', 'матриця долі онлайн', 'розрахунок матриці долі', 'нумерологія', 'matrix of destiny', 'destiny matrix calculator'],
  authors: [{ name: 'Matrix of Destiny' }],
  openGraph: {
    type: 'website',
    locale: 'uk_UA',
    alternateLocale: 'en_US',
    siteName: 'Matrix of Destiny',
    title: 'Матриця Долі онлайн — безкоштовний розрахунок',
    description: 'Розрахуй свою Матрицю Долі безкоштовно за датою народження. 22 енергії, карма, таланти і призначення.',
    url: 'https://yourmatrixofdestiny.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Матриця Долі онлайн — безкоштовний розрахунок',
    description: 'Розрахуй свою Матрицю Долі безкоштовно. 22 енергії, карма, таланти і призначення.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: 'https://yourmatrixofdestiny.com/uk/',
    languages: {
      'uk': 'https://yourmatrixofdestiny.com/uk/',
      'en': 'https://yourmatrixofdestiny.com/en/',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <div className="star-bg" />
        {children}
      </body>
    </html>
  );
}
