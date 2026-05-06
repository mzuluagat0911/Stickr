import { AppBottomNav } from "@/components/features/app-bottom-nav";
import { AppSidebar } from "@/components/features/app-sidebar";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <AppSidebar className="relative z-20 hidden md:flex" />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip">
        <div className="mx-auto min-h-0 w-full max-w-6xl flex-1 px-5 py-7 pb-[calc(7.75rem+env(safe-area-inset-bottom))] md:px-6 md:py-9 md:pb-10">
          {children}
        </div>
      </div>
      <AppBottomNav />
    </div>
  );
}
