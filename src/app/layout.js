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
    default: 'MemeHub HQ: Find & Download Trending Memes, Clips & Audio for Video Content',
    template: '%s | MemeHub HQ'
  },
  description: 'Discover viral memes, funny footage, and trending clips—all in one place! Free to browse and download, our platform helps content creators quickly find the perfect clips for their videos.',
  keywords: [
    'memes',
    'funny memes',
    'viral memes',
    'meme generator',
    'funny clips',
    'viral videos',
    'funny videos',
    'funny sounds',
    'trending memes',
    'memes for youtube video ',
    'meme collection',
    'download memes',
    'memes pack ',
    'meme community',
    'reaction memes',
    'video memes',
    'audio memes',
    'meme hub',
    'memehub hq',
    'free memes',
    'content creator tools',
    'stock footage',
    'download viral memes',
    'trending videos for creators',
    'download memes for free',
    'meme clips for YouTube',
    'free sound effects for videos',
    'viral clips download',
    'funny audio clips',
    'reaction videos',
    'creator resources',
    'free memes for content creators',
    'viral content for social media',
    'meme templates',
    'clip downloads for creators',
    'funny short videos',
    'trending meme sounds',
    'audio clips for videos'
  ],
  authors: [{ name: 'MemeHub HQ Team' }],
  creator: 'MemeHub HQ',
  publisher: 'MemeHub HQ',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://memehubhq.vercel.app',
    title: 'MemeHub HQ: Find & Download Trending Memes, Clips & Audio for Video Content',
    description: 'Discover viral memes, funny footage, and trending clips—all in one place! Free to browse and download, our platform helps content creators quickly find the perfect clips for their videos.',
    siteName: 'MemeHubHQ',
    images: [
      {
        url: '/og-image.png', // Create this 1200x630 image
        width: 1200,
        height: 630,
        alt: 'MemeHub HQ - Viral Memes Hub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MemeHub HQ: Find & Download Trending Memes, Clips & Audio for Video Content',
    description: 'Discover viral memes, funny footage, and trending clips—all in one place! Free to browse and download, our platform helps content creators quickly find the perfect clips for their videos.',
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
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
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
      <body suppressHydrationWarning={true} className={`${inter.className} antialiased bg-white dark:bg-[#050505] text-black dark:text-white transition-colors duration-300`}>
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