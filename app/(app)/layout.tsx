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
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:py-8 md:pb-8">
          {children}
        </div>
      </div>
      <AppBottomNav />
    </div>
  );
}
