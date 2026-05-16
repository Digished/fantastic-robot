import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "Spendbox — celebrate together",
  description:
    "Create a celebration page friends can fill with messages, voice notes and a group gift. Built for WhatsApp.",
  openGraph: {
    title: "Spendbox",
    description: "A digital wall for celebrating the people you love.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${fraunces.variable}`}>
      <body className="min-h-[100dvh] bg-white text-ink">{children}</body>
    </html>
  );
}
