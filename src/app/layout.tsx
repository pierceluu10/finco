import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Finco — Your Financial Ecosystem",
  description:
    "AI financial decision engine for Canadians. Turn your finances into a live visual graph, forecast future cash pressure, and simulate major life decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${manrope.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
