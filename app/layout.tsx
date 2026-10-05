import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
});

const departuremono = localFont({
  src: "../public/fonts/departure-mono/DepartureMono-Regular.woff2",
  variable: "--font-departure-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Student Registration | ICT Khalifa Niyas",
  description: "Register student",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${departuremono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}