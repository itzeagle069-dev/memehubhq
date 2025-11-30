import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthContextProvider } from "@/context/AuthContext";
import { DownloadProvider } from "@/context/DownloadContext";
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";
import ImageProtection from "@/components/ImageProtection";
import JsonLdSchema from "@/components/JsonLd";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  metadataBase: new URL('https://memehubhq.vercel.app'),
  title: {
    default: 'MemeHubHQ - Viral Memes, Funny Videos & Sound Effects',
    template: '%s | MemeHubHQ'
  },
  description: 'Discover and share the internet\'s funniest memes, viral videos, and sound effects. Join MemeHubHQ - the world\'s fastest growing meme community with thousands of daily uploads.',
  keywords: [
    'memes',
    'funny memes',
    'viral memes',
    'meme generator',
    'funny videos',
    'viral videos',
    'sound effects',
    'funny sounds',
    'trending memes',
    'dank memes',
    'meme collection',
    'download memes',
    'share memes',
    'meme community',
    'reaction memes',
    'video memes',
    'audio memes',
    'meme hub',
    'memehubhq',
    'free memes'
  ],
  authors: [{ name: 'MemeHubHQ Team' }],
  creator: 'MemeHubHQ',
  publisher: 'MemeHubHQ',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://memehubhq.vercel.app',
    title: 'MemeHubHQ - Viral Memes, Funny Videos & Sound Effects',
    description: 'Discover and share the internet\'s funniest memes, viral videos, and sound effects. Join the world\'s fastest growing meme community.',
    siteName: 'MemeHubHQ',
    images: [
      {
        url: '/og-image.png', // Create this 1200x630 image
        width: 1200,
        height: 630,
        alt: 'MemeHubHQ - Viral Memes Hub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MemeHubHQ - Viral Memes & Funny Videos',
    description: 'Discover and share the internet\'s funniest memes, viral videos, and sound effects.',
    creator: '@memehubhq', // Update with your actual Twitter handle
    images: ['/og-image.png'],
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
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://memehubhq.vercel.app',
  },
  verification: {
    google: 'your-google-verification-code', // Add from Google Search Console
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  category: 'entertainment',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <JsonLdSchema />
      </head>
      <body className={`${inter.className} antialiased bg-white dark:bg-[#050505] text-black dark:text-white transition-colors duration-300`}>
        <AuthContextProvider>
          <DownloadProvider>
            <ImageProtection />
            <Suspense fallback={<div className="h-16 bg-white dark:bg-[#050505]" />}>
              <Navbar />
            </Suspense>
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
            <Toaster position="bottom-right" />
          </DownloadProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}