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
        "rounded-r-2xl border border-black/10 bg-white/95 text-zinc-900 shadow-[0_25px_60px_-12px_rgb(0_0_0_/_0.2)] ring-1 ring-black/10 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-950/95 dark:text-zinc-50 dark:shadow-[0_8px_40px_-12px_rgb(0_0_0_/_0.55)] dark:ring-white/10",
        "supports-[backdrop-filter]:bg-white/92 supports-[backdrop-filter]:dark:bg-zinc-950/92",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-y-10 left-0 w-px bg-gradient-to-b from-transparent via-zinc-300/80 to-transparent opacity-80 dark:via-zinc-600/50"
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
                "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium tracking-tight text-zinc-700 transition-[color,background-color,border-color,box-shadow] duration-200 outline-none dark:text-zinc-300",
                "hover:border-black/10 hover:bg-zinc-100 hover:text-zinc-950 hover:shadow-sm dark:hover:border-white/10 dark:hover:bg-zinc-800/80 dark:hover:text-white",
                "focus-visible:ring-2 focus-visible:ring-[#2b59c3]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950",
                active
                  ? "border-black/10 bg-zinc-100 text-zinc-950 shadow-sm ring-1 ring-[#d02670]/25 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:ring-[#ff6ba8]/30"
                  : "",
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
