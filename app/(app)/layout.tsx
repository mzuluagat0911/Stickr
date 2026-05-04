import { AppBottomNav } from "@/components/features/app-bottom-nav";
import { AppSidebar } from "@/components/features/app-sidebar";
import { AuthWc2026Backdrop } from "@/components/features/auth-wc2026-backdrop";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {/* z-20: el rail lateral queda por encima; el WC solo vive en la columna central (sin 100vw). */}
      <AppSidebar className="relative z-20 hidden md:flex" />
      <div className="relative isolate z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip">
        {/* Fondo WC recortado a ESTA columna: nunca se mete bajo el aside ni el header. */}
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          aria-hidden
        >
          <AuthWc2026Backdrop variant="column" />
        </div>
        <div className="relative z-10 mx-auto min-h-0 w-full max-w-6xl flex-1 px-5 py-7 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:py-9 md:pb-10">
          {children}
        </div>
      </div>
      <AppBottomNav />
    </div>
  );
}
