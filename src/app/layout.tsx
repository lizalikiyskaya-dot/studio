import type { Metadata } from "next";
import { Inter, Lora, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const lora = Lora({
  subsets: ["latin", "cyrillic"],
  variable: "--font-fraunces",
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-playfair",
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
      className={`${inter.variable} ${lora.variable} ${playfair.variable} min-h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
