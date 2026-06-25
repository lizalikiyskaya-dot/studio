import type { Metadata } from "next";
import { Bitter, JetBrains_Mono, Literata } from "next/font/google";
import "./globals.css";

const literata = Literata({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains",
});

const bitter = Bitter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-old-standard",
});

export const metadata: Metadata = {
  title: "Студия художественной прозы Лизы Ликийской",
  description: "Личный кабинет ученика",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${literata.variable} ${jetbrainsMono.variable} ${bitter.variable} min-h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
