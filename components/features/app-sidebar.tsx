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
        "border-border/40 bg-background/55 supports-backdrop-filter:bg-background/45 w-56 shrink-0 border-r backdrop-blur-xl backdrop-saturate-150",
        className,
      )}
    >
      <nav className="flex flex-col gap-0.5 p-3 pt-8" aria-label="Principal">
        {APP_NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "hover:bg-foreground/[0.05] flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium tracking-tight transition-colors duration-150 dark:hover:bg-white/[0.06]",
                active
                  ? "bg-foreground/[0.07] text-foreground dark:bg-white/[0.1] dark:text-white"
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
