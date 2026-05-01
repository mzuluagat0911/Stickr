import type { Metadata } from "next";
import { Suspense } from "react";

import { Header } from "@/components/features/header";

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
          <Suspense
            fallback={<div className="bg-background h-14 w-full border-b" />}
          >
            <Header />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
