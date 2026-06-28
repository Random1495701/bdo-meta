import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "BDO Skills Codex — Live skill database with animation durations",
  description:
    "Live Black Desert Online skill database synced from bdocodex.com, including animation durations extracted via ffprobe.",
  keywords: [
    "BDO",
    "Black Desert Online",
    "skills",
    "codex",
    "bdocodex",
    "animation",
    "database",
  ],
  authors: [{ name: "BDO Skills Codex" }],
  openGraph: {
    title: "BDO Skills Codex",
    description:
      "Live Black Desert Online skill database synced from bdocodex.com",
    siteName: "BDO Skills Codex",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BDO Skills Codex",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
