import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "La Scuderia – Create your drink",
  description: "Creează-ți băutura la La Scuderia",
};

export const viewport: Viewport = {
  themeColor: "#12100e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
