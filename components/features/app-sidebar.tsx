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
        "relative z-20 flex w-56 shrink-0 flex-col",
        "bg-sidebar text-sidebar-foreground",
        "border-sidebar-border rounded-r-xl border",
        "shadow-[inset_1px_0_0_rgb(255_255_255_/_0.45),inset_-1px_0_0_rgb(0_0_0_/_0.04),4px_0_28px_-12px_rgb(0_0_0_/_0.1)]",
        "dark:border-sidebar-border dark:shadow-[inset_1px_0_0_rgb(255_255_255_/_0.06),inset_-1px_0_0_rgb(0_0_0_/_0.35),6px_0_36px_-10px_rgb(0_0_0_/_0.5)]",
        "supports-[backdrop-filter]:backdrop-blur-md supports-[backdrop-filter]:backdrop-saturate-150",
        className,
      )}
    >
      {/* Línea fina costado viewport: ancla visual sin competir con el contenido WC. */}
      <span
        className="via-sidebar-border pointer-events-none absolute inset-y-8 left-0 w-px bg-gradient-to-b from-transparent to-transparent opacity-90"
        aria-hidden
      />
      <nav
        className="flex flex-col gap-1 px-3 py-7 pb-8"
        aria-label="Principal"
      >
        {APP_NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium tracking-tight transition-[color,background-color,border-color,box-shadow] duration-200 outline-none",
                "hover:border-sidebar-border/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-sm",
                "focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar focus-visible:ring-2 focus-visible:ring-offset-2",
                active
                  ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground ring-sidebar-primary/20 dark:ring-sidebar-primary/35 shadow-sm ring-1"
                  : "text-sidebar-foreground/78",
              )}
            >
              <Icon
                className={cn(
                  "size-5 shrink-0 transition-opacity",
                  active ? "opacity-100" : "opacity-85",
                )}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
