import type { Metadata } from "next";
import { Suspense } from "react";

import { Header } from "@/components/features/header";
import { AuthWc2026Backdrop } from "@/components/features/auth-wc2026-backdrop";

import "./globals.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Stickr",
    template: "%s · Stickr",
  },
  description: "Intercambios de figuritas Mundial 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>
          <div className="relative flex min-h-full flex-1 flex-col overflow-x-clip">
            <div
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
              aria-hidden
            >
              <AuthWc2026Backdrop />
            </div>
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <Suspense
                fallback={
                  <div className="h-14 w-full border-b border-black/10 bg-white/90 dark:border-white/10 dark:bg-zinc-950/90" />
                }
              >
                <Header />
              </Suspense>
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
