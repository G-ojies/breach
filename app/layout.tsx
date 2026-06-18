import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BREACH — exploit AI-simulated systems on 0G",
  description:
    "A hacking game where every target is generated and judged by AI running on 0G Compute. Pop the box. Climb the board.",
  openGraph: {
    title: "BREACH",
    description:
      "Exploit AI-simulated systems. Every target is born and judged on 0G Compute.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${mono.variable} h-full antialiased`}>
      <body className="crt min-h-full">{children}</body>
    </html>
  );
}
