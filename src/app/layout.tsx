import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Debate Room — Multi-Agent LLM Discussion",
  description:
    "Orchestrate structured debates and discussions between multiple LLM guests, moderated by an LLM host.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
