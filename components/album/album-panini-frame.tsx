"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Mosaico vertical inspirado en el lomo del álbum Panini WC2026 (26 superpuestos, colores sólidos). */
const PANINI_TILE_SVG =
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="56" height="80" viewBox="0 0 56 80">
  <rect width="56" height="80" fill="rgb(250,250,249)"/>
  <g fill="none">
    <text x="-6" y="24" fill="rgb(185,28,28)" font-family="system-ui,Segoe UI,sans-serif" font-size="34" font-weight="900" transform="rotate(-11 14 18)">26</text>
    <text x="10" y="44" fill="rgb(29,78,216)" font-family="system-ui,Segoe UI,sans-serif" font-size="28" font-weight="900" transform="rotate(14 28 38)">26</text>
    <text x="-2" y="68" fill="rgb(22,163,74)" font-family="system-ui,Segoe UI,sans-serif" font-size="26" font-weight="900" transform="rotate(-7 16 58)">26</text>
    <text x="26" y="22" fill="rgb(234,179,8)" font-family="system-ui,Segoe UI,sans-serif" font-size="20" font-weight="900" transform="rotate(9 36 16)">26</text>
    <text x="18" y="72" fill="rgb(126,34,206)" font-family="system-ui,Segoe UI,sans-serif" font-size="22" font-weight="900" transform="rotate(-5 30 66)">26</text>
    <text x="4" y="12" fill="rgb(14,165,233)" font-family="system-ui,Segoe UI,sans-serif" font-size="18" font-weight="900" transform="rotate(6 12 8)">26</text>
  </g>
</svg>`);

const paniniTileUrl = `url("data:image/svg+xml;charset=utf-8,${PANINI_TILE_SVG}")`;

function PaniniRail({
  side,
  className,
}: {
  side: "left" | "right";
  className?: string;
}) {
  return (
    <aside
      aria-hidden
      className={cn(
        "relative flex min-h-full w-2 shrink-0 overflow-hidden rounded-md border border-zinc-900/10 bg-zinc-100 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.65)] sm:w-11 sm:rounded-xl md:w-12 lg:w-14",
        "dark:border-zinc-600/35 dark:bg-zinc-950 dark:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]",
        side === "right" && "scale-x-[-1]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-repeat opacity-[0.92] dark:opacity-55"
        style={{
          backgroundImage: paniniTileUrl,
          backgroundSize: "56px 80px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/55 via-transparent to-zinc-200/40 dark:from-zinc-800/25 dark:via-transparent dark:to-zinc-950/60" />
      <div className="pointer-events-none absolute inset-0 dark:bg-zinc-950/35" />
    </aside>
  );
}

/**
 * Marco tipo «libro abierto»: laterales decorativos + columna central (contenido funcional).
 * `pointer-events-none` en ornamentos; no intercepta clics ni teclado.
 */
export function AlbumPaniniFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full max-w-full min-w-0 items-stretch gap-1 overflow-x-clip sm:gap-2 md:gap-3 lg:gap-4",
        className,
      )}
    >
      <PaniniRail side="left" />
      <div className="max-w-full min-w-0 flex-1 basis-0">{children}</div>
      <PaniniRail side="right" />
    </div>
  );
}
