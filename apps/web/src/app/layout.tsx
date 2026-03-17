import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Social Pro — Agency Social Media Management",
  description:
    "Comprehensive social media management and client management panel for agencies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
