import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Signal Scout — Funding-to-hiring intelligence for recruiters",
  description:
    "Track newly funded companies before hiring demand becomes obvious. Signal Scout monitors Series A–C funding events and turns them into recruiter-ready opportunities.",
  icons: {
    icon: "/brand-mark.png",
    apple: "/brand-mark.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className}`}>{children}</body>
    </html>
  );
}
