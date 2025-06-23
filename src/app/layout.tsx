import type { Metadata } from "next";
import { Carlito, Carattere } from "next/font/google";
import "./globals.css";

const carlito = Carlito({
  variable: "--font-carlito",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const carattere = Carattere({
  variable: "--font-carattere",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Studii - Your ultimate no BS SAT tool",
  description: "Master the SAT with Studii's comprehensive practice platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${carlito.variable} ${carattere.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
