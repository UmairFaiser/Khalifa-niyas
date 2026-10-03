import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local"
import "./globals.css";



const inter = Inter({
  variable: "--font-inter",
  display: "swap"
});

const departuremono = localFont({
  src: "../public/fonts/departure-mono/DepartureMono-Regular.woff2",
  variable: "--font-departure-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Student Registration | ICT with Khalifa Niyas",
  description: "Register as a student to receive your unique index number",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${departuremono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}

