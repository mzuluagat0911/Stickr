import { AppBottomNav } from "@/components/features/app-bottom-nav";
import { AppSidebar } from "@/components/features/app-sidebar";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <AppSidebar className="hidden md:flex" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-7 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:py-9 md:pb-10">
          {children}
        </div>
      </div>
      <AppBottomNav />
    </div>
  );
}
