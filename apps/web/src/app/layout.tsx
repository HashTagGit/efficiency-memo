import type { Metadata } from "next";
import { Manrope, Cormorant_Garamond } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { APP_NAME } from "@memo/shared";
import { AuthHashHandler } from "@/components/auth/auth-hash-handler";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A modern tool gallery for daily productivity — battery tracking, time management, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${cormorant.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
