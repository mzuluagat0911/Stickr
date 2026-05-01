"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS, isNavActive } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bg-background/90 border-border fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md md:hidden"
      aria-label="Principal"
    >
      <ul className="grid grid-cols-5 gap-0.5 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {APP_NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors sm:text-xs",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-6 shrink-0", active && "stroke-[2.25]")}
                  aria-hidden
                />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
