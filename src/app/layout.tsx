import type { Metadata } from 'next';
import { Michroma, Orbitron } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
const michroma = Michroma({ 
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-michroma',
  preload: true,
  adjustFontFallback: false
});

const orbitron = Orbitron({ 
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-orbitron',
  preload: true,
  adjustFontFallback: false
});


export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0052FF',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://s4labs.xyz'),
  title: {
    default: 'S4 Labs - Token Launchpad on Base L2',
    template: '%s | S4 Labs'
  },
  description: 'The premier token launchpad on Base L2. Launch your token, build your community, and reach new heights.',
  keywords: 'Base, L2, AlienBase, ALB, token launchpad, DeFi, S4Labs, s4labs.xyz, alienbase.xyz',
  authors: [{ name: 'S4 Labs', url: 'https://s4labs.xyz' }],
  creator: 'S4 Labs',
  publisher: 'S4 Labs',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' }
    ],
    apple: '/apple-touch-icon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'S4 Labs'
  },
  openGraph: {
    title: 'S4 Labs - Token Launchpad',
    description: 'Launch and trade tokens on Base L2. Powered by S4 Labs.',
    url: 'https://s4labs.xyz',
    siteName: 'S4Labs',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'S4 Labs',
    description: 'The premier token launchpad on Base L2',
    site: '@s4onbase',
    creator: '@s4onbase',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Plausible Analytics */}
        <Script
          defer
          data-domain="s4labs.xyz"
          src="https://plausible.io/js/script.file-downloads.hash.outbound-links.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${michroma.variable} ${orbitron.variable} font-sans bg-canvas text-text-primary min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}