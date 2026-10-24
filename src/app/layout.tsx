import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreshLoop AI — Rescue Food Before It Becomes Waste",
  description:
    "FreshLoop AI connects surplus food donors with eligible recipients, using intelligent matching and urgency-based prioritization to reduce food waste and feed communities.",
  keywords: ["food rescue", "surplus food", "food waste", "sustainability", "AI", "food redistribution"],
  openGraph: {
    title: "FreshLoop AI",
    description: "AI-powered food rescue platform that matches surplus food with communities in need.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
