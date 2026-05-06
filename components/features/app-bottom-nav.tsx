"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS, isNavActive } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label="Principal"
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-[22px] border border-black/10 bg-white/95 shadow-[0_25px_60px_-12px_rgb(0_0_0_/_0.28)] ring-1 ring-black/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-[0_8px_36px_-12px_rgb(0_0_0_/_0.55)] dark:ring-white/10">
        <ul className="grid grid-cols-5 gap-0.5 px-0.5 py-0.5">
          {APP_NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-[14px] px-0.5 py-1.5 text-[10px] font-medium tracking-tight transition-colors duration-150 sm:text-[11px]",
                    active
                      ? "text-primary bg-primary/[0.08] dark:bg-primary/[0.14]"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[21px] shrink-0 stroke-[1.75]",
                      active && "stroke-[2.15]",
                    )}
                    aria-hidden
                  />
                  <span className="max-w-full text-center text-[8.5px] leading-[1.12] font-medium break-words whitespace-normal sm:text-[10px] sm:leading-[1.15]">
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
