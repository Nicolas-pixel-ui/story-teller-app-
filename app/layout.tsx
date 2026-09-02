import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/nav/site-header";
import { SiteHeaderFallback } from "@/components/nav/site-header-fallback";
import ClientParticleBackground from "@/components/ui/client-particle-background";
import { CriticalContrastCss } from "@/components/ui/critical-contrast-css";
import { ThemeInit } from "@/components/ui/theme-init";
import { getAppUrl } from "@/lib/config/env";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_PAGE_TITLE,
  TITLE_TEMPLATE,
  buildGlobalJsonLd,
} from "@/lib/seo/site-metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: (() => {
    try {
      return new URL(getAppUrl().replace(/\/$/, "") || "http://localhost:3000");
    } catch {
      return new URL("http://localhost:3000");
    }
  })(),
  title: {
    default: DEFAULT_PAGE_TITLE,
    template: TITLE_TEMPLATE,
  },
  description: DEFAULT_DESCRIPTION,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = buildGlobalJsonLd(getAppUrl());
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="only light" />
        <CriticalContrastCss />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme='only light';}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
      >
        <ThemeInit />
        <ClientParticleBackground />
        <Suspense fallback={<SiteHeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
