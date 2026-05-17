import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Suspense } from "react";
import { GlobalButtonLoading } from "@/components/global-button-loading";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700", "800"],
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
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="min-h-[100dvh] bg-white text-ink">
        <Suspense fallback={null}>
          <GlobalButtonLoading />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
