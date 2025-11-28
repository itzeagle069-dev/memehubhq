import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthContextProvider } from "@/context/AuthContext";
import { DownloadProvider } from "@/context/DownloadContext";
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";
import ImageProtection from "@/components/ImageProtection";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "MemeHubHQ - Viral Memes & Videos",
  description: "The world's fastest growing community for viral memes, funny videos, and sound effects.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense Auto Ads - Replace with your actual AdSense ID */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        ></script>
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