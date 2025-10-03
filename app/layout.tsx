import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rahi CRM",
  other: { "color-scheme": "light" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
