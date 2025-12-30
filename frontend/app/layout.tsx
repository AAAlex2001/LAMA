import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAMAplanner",
  description: "Telegram posting automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
