import type { Metadata } from "next";
import { Literata, Onest } from "next/font/google";
import { SiteDialogHost } from "@/components/SiteDialog";
import "./globals.css";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const literata = Literata({
  subsets: ["latin", "cyrillic"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Андреенко — студия художественной прозы",
  description: "Личный кабинет студии художественной прозы",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${onest.variable} ${literata.variable} min-h-full antialiased`}
    >
      <body className="min-h-full">
        <SiteDialogHost />
        {children}
      </body>
    </html>
  );
}
