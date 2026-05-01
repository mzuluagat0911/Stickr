"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS, isNavActive } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pt-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label="Principal"
    >
      <div className="border-border/45 bg-background/72 supports-[backdrop-filter]:bg-background/58 dark:supports-[backdrop-filter]:bg-background/55 pointer-events-auto mx-auto max-w-md rounded-[22px] border shadow-[0_4px_28px_-8px_rgb(0_0_0_/_0.12)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.08] dark:shadow-[0_8px_36px_-12px_rgb(0_0_0_/_0.55)]">
        <ul className="grid grid-cols-5 gap-1 px-1 py-1">
          {APP_NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-[14px] px-1 py-2 text-[10px] font-medium tracking-tight transition-colors duration-150 sm:text-[11px]",
                    active
                      ? "text-primary bg-primary/[0.08] dark:bg-primary/[0.14]"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[22px] shrink-0 stroke-[1.75]",
                      active && "stroke-[2.15]",
                    )}
                    aria-hidden
                  />
                  <span className="line-clamp-2 max-w-full text-center text-[9px] leading-[1.15] font-medium sm:text-[10px]">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
