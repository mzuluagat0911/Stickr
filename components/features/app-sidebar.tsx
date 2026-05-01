"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS, isNavActive } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "bg-card/50 supports-backdrop-filter:bg-card/40 w-56 shrink-0 border-r backdrop-blur-sm",
        className,
      )}
    >
      <nav className="flex flex-col gap-1 p-3 pt-6" aria-label="Principal">
        {APP_NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
