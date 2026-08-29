import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Black Future Phone',
  description: 'Una llamada del futuro. Tus respuestas deciden la línea temporal.',
  openGraph: {
    title: 'Black Future Phone',
    description: 'Tu futuro está llamando. Contesta y descubre qué línea temporal construiste.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Black Future Phone' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Black Future Phone',
    description: 'Tu futuro está llamando.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
