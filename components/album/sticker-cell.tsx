"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, PlusIcon, StarIcon } from "lucide-react";

import type { CatalogStickerDTO, UserStickerEntryDTO } from "@/lib/album/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export type CellVisualState = "missing" | "have" | "duplicate";

function positionLabel(type: string, playerPosition: string | null): string {
  switch (type) {
    case "team_crest":
      return "Escudo";
    case "team_photo":
      return "Grupal";
    default:
      return playerPosition?.trim() || "Jugador";
  }
}

function resolveVisual(entry: UserStickerEntryDTO | undefined): {
  state: CellVisualState;
  dupCount: number;
} {
  if (!entry) {
    return { state: "missing", dupCount: 0 };
  }
  if (entry.status === "have") {
    return { state: "have", dupCount: 0 };
  }
  const n = Math.max(2, entry.duplicateCount || 2);
  return { state: "duplicate", dupCount: n };
}

export type StickerCellProps = {
  sticker: CatalogStickerDTO;
  entry: UserStickerEntryDTO | undefined;
  tabIndex: number;
  onCycleForward: () => void;
  onCycleBackward: () => void;
  onSetHave: () => void;
  onSetDuplicate: (count: number) => void;
  onUnmark: () => void;
  exchangePriority?: boolean;
  /** Solo en faltantes; menú contextual prioridad intercambio */
  onToggleExchangePriority?: () => void;
  registerCell?: (el: HTMLButtonElement | null) => void;
  onFocus?: () => void;
};

export function StickerCell({
  sticker,
  entry,
  tabIndex,
  onCycleForward,
  onCycleBackward,
  onSetHave,
  onSetDuplicate,
  onUnmark,
  exchangePriority = false,
  onToggleExchangePriority,
  registerCell,
  onFocus,
}: StickerCellProps) {
  const { state, dupCount } = resolveVisual(entry);
  const [panelOpen, setPanelOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  useEffect(() => {
    if (!panelOpen) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [panelOpen]);

  const onPrimaryClick = () => {
    if (state === "duplicate") {
      setPanelOpen((o) => !o);
      return;
    }
    onCycleForward();
  };

  const showImage = Boolean(sticker.imageUrl);

  return (
    <div ref={wrapRef} className="relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            ref={registerCell}
            data-testid={`sticker-cell-${sticker.id}`}
            data-sticker-id={sticker.id}
            data-user-state={state}
            tabIndex={tabIndex}
            aria-labelledby={labelId}
            className={cn(
              "focus-visible:ring-ring relative flex aspect-[4/5] w-full flex-col rounded-lg border text-left outline-none focus-visible:ring-2",
              state === "missing" &&
                "bg-muted/80 text-muted-foreground border-border",
              state === "have" &&
                "border-emerald-600/40 bg-emerald-500/15 text-emerald-950 dark:text-emerald-50",
              state === "duplicate" &&
                "border-amber-600/50 bg-amber-400/20 text-amber-950 dark:text-amber-50",
            )}
            onClick={onPrimaryClick}
            onFocus={onFocus}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (state === "duplicate") {
                  setPanelOpen((o) => !o);
                } else {
                  onCycleForward();
                }
              }
              if (e.key === " ") {
                e.preventDefault();
                if (e.shiftKey) {
                  onCycleBackward();
                } else if (state === "duplicate") {
                  setPanelOpen((o) => !o);
                } else {
                  onCycleForward();
                }
              }
              if (state === "duplicate" && /^[1-9]$/.test(e.key)) {
                e.preventDefault();
                const d = Number(e.key);
                onSetDuplicate(d + 1);
              }
            }}
          >
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sticker.imageUrl!}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-10 w-full rounded-t-md object-cover"
              />
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col justify-between p-1.5 sm:p-2">
              <div className="flex items-start justify-between gap-0.5">
                <span
                  id={labelId}
                  className="text-lg leading-none font-bold sm:text-xl"
                >
                  {sticker.stickerNumber}
                </span>
                {state === "missing" ? (
                  exchangePriority ? (
                    <StarIcon
                      className="size-4 shrink-0 fill-amber-500 text-amber-600 dark:fill-amber-400 dark:text-amber-300"
                      aria-label="Prioridad intercambio"
                    />
                  ) : (
                    <PlusIcon className="size-4 shrink-0 opacity-60" />
                  )
                ) : null}
                {state === "have" ? (
                  <CheckIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : null}
                {state === "duplicate" ? (
                  <Badge
                    variant="secondary"
                    className="h-5 border-amber-700/30 bg-amber-500/50 px-1 text-[10px] font-semibold text-amber-950 dark:text-amber-950"
                  >
                    ×{dupCount}
                  </Badge>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] leading-tight font-medium uppercase sm:text-[11px]">
                  {positionLabel(sticker.type, sticker.playerPosition)}
                </p>
                {sticker.playerName ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug font-medium sm:text-xs">
                    {sticker.playerName}
                  </p>
                ) : null}
              </div>
            </div>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Casilla {sticker.stickerNumber}</ContextMenuLabel>
          <ContextMenuItem onSelect={onSetHave}>
            Marcar «la tengo»
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onSetDuplicate(2)}>
            Marcar repetida (×2)
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onSelect={onUnmark}>
            Quitar marca
          </ContextMenuItem>
          {state === "missing" && onToggleExchangePriority ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={onToggleExchangePriority}>
                {exchangePriority
                  ? "Quitar prioridad en Intercambio"
                  : "Priorizar en Intercambio"}
              </ContextMenuItem>
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>

      {panelOpen && state === "duplicate" ? (
        <div
          className="bg-popover text-popover-foreground ring-foreground/10 animate-in fade-in-0 zoom-in-95 absolute top-full left-0 z-50 mt-1 w-48 rounded-lg p-2 text-xs shadow-md ring-1"
          role="dialog"
          aria-label={`Cantidad repetida ${sticker.stickerNumber}`}
        >
          <p className="text-muted-foreground mb-2 font-medium">
            Cantidad de figuritas
          </p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
                20,
              ] as const
            ).map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                variant={dupCount === n ? "default" : "outline"}
                className="h-7 min-w-8 px-1.5 text-[11px]"
                onClick={() => {
                  onSetDuplicate(n);
                  setPanelOpen(false);
                }}
              >
                ×{n}
              </Button>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1 border-t pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 w-full text-xs"
              onClick={() => {
                onSetHave();
                setPanelOpen(false);
              }}
            >
              Solo la tengo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive h-8 w-full text-xs"
              onClick={() => {
                onUnmark();
                setPanelOpen(false);
              }}
            >
              Quitar marca
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
