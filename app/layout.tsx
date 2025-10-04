// app/layout.tsx (or app/(app)/layout.tsx)
import "./globals.css";
import ThemeProvider from "@/components/theme/ThemeProvider";
import GlobalNavLoader from "@/components/GlobalNavLoader";

export const metadata = {
  title: "Rahi CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-white text-neutral-900 antialiased transition-colors dark:bg-neutral-950 dark:text-neutral-100">
        <ThemeProvider>
          {/* Global route-transition overlay (short & pretty) */}
          <GlobalNavLoader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
