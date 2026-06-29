import type { Metadata } from "next";
import { Geist, Geist_Mono, EB_Garamond } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/skills/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const garamond = EB_Garamond({
  variable: "--font-bdo-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BDO Meta — Black Desert Online Skill Database",
  description:
    "Live Black Desert Online skill database synced from bdocodex.com, including animation durations extracted via ffprobe.",
  keywords: [
    "BDO",
    "Black Desert Online",
    "skills",
    "meta",
    "bdocodex",
    "animation",
    "database",
    "BDO Meta",
  ],
  authors: [{ name: "BDO Meta" }],
  openGraph: {
    title: "BDO Meta",
    description:
      "Live Black Desert Online skill database synced from bdocodex.com",
    siteName: "BDO Meta",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BDO Meta",
    description:
      "Live Black Desert Online skill database synced from bdocodex.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${garamond.variable} antialiased bg-bdo-ink text-amber-50`}
      >
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
