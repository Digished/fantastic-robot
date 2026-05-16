import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
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
  themeColor: "#FBF6EE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  );
}
