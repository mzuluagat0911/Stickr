"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getExchangeOverlapDetailAction } from "@/app/actions/exchange-overlap";
import {
  formatOverlapStickerLine,
  overlapStickerCatalogDto,
  type ExchangeOverlapDetailOk,
  type ExchangeOverlapStickerRow,
} from "@/lib/discover/exchange-overlap-detail";
import {
  catalogSlotLabel,
  catalogStickerDisplayLabel,
} from "@/lib/album/slot-label";
import { fifaTeamFlagEmoji } from "@/lib/teams/fifa-country";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type DiscoverOverlapScrollTarget =
  | "top"
  | "matches-theirs"
  | "matches-yours"
  | "their-all-dups"
  | "their-all-missing";

function rowsToClipboard(rows: ExchangeOverlapStickerRow[]): string {
  return rows.map(formatOverlapStickerLine).join("\n");
}

function StickerList({
  rows,
  showTradable,
  priorityKey,
}: {
  rows: ExchangeOverlapStickerRow[];
  showTradable: boolean;
  priorityKey?: "priorityStar" | "theyPrioritized";
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-xs italic">
        Nada que mostrar.
      </p>
    );
  }
  return (
    <ul className="border-border/70 bg-muted/30 max-h-52 overflow-y-auto rounded-xl border shadow-inner sm:max-h-56">
      {rows.map((s) => {
        const flag = fifaTeamFlagEmoji(s.teamCode);
        const cat = overlapStickerCatalogDto(s);
        const albumLine = cat
          ? `${catalogStickerDisplayLabel(cat)} · ${catalogSlotLabel(cat)}`
          : null;
        const name = (s.playerName ?? "").trim();
        return (
          <li
            key={s.stickerId}
            className="border-border/50 hover:bg-muted/55 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-2.5 py-2 transition-colors last:border-b-0 sm:px-3 sm:text-[0.8125rem]"
          >
            <span className="flex min-w-0 flex-1 items-start gap-2.5">
              <span
                className="text-[1.15rem] leading-none select-none sm:text-xl"
                aria-hidden
              >
                {flag}
              </span>
              <span className="min-w-0 pt-0.5 leading-snug">
                {albumLine ? (
                  <span className="text-foreground font-semibold tabular-nums">
                    {albumLine}
                  </span>
                ) : (
                  <>
                    <span className="text-foreground font-semibold tabular-nums">
                      #{s.stickerNumber}
                    </span>
                    <span className="text-muted-foreground px-1.5">·</span>
                    <span className="bg-background/80 text-muted-foreground ring-border/60 dark:bg-background/40 rounded-md px-1 py-px font-mono text-[11px] font-semibold tracking-wide ring-1">
                      {s.teamCode}
                    </span>
                  </>
                )}
                {name ? (
                  <>
                    <span className="text-muted-foreground px-1">·</span>
                    <span className="text-foreground/95">{name}</span>
                  </>
                ) : null}
              </span>
            </span>
            <span className="text-muted-foreground flex shrink-0 flex-wrap items-center gap-2 tabular-nums">
              {priorityKey === "priorityStar" && s.priorityStar ? (
                <span
                  className="text-primary font-semibold"
                  title="Tu prioridad ⭐"
                >
                  ⭐
                </span>
              ) : null}
              {priorityKey === "theyPrioritized" && s.theyPrioritized ? (
                <span
                  className="text-primary font-semibold"
                  title="Ellos la priorizaron"
                >
                  ⭐
                </span>
              ) : null}
              {showTradable && s.tradableQty != null && s.tradableQty > 0 ? (
                <span className="bg-primary/10 text-primary rounded-md px-1.5 py-px text-[11px] font-semibold">
                  ×{s.tradableQty}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Section({
  id,
  title,
  description,
  children,
  actions,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm font-semibold tracking-tight">
            {title}
          </h3>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-1">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function DiscoverTradeOverlapModal({
  open,
  onOpenChange,
  peerUserId,
  peerUsername,
  scrollTarget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerUserId: string;
  peerUsername: string;
  scrollTarget: DiscoverOverlapScrollTarget;
}) {
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState<ExchangeOverlapDetailOk | null>(null);
  const closeRef = useRef(onOpenChange);
  useEffect(() => {
    closeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    startTransition(async () => {
      setDetail(null);
      const res = await getExchangeOverlapDetailAction(peerUserId);
      if (cancelled) return;
      if (!res.ok) {
        toast.error(res.message);
        closeRef.current(false);
        setDetail(null);
        return;
      }
      if (!res.data) {
        toast.error("No se pudo cargar.");
        closeRef.current(false);
        setDetail(null);
        return;
      }
      setDetail(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, peerUserId]);

  useEffect(() => {
    if (!open || !detail || pending) return;
    const id =
      scrollTarget === "matches-theirs"
        ? "overlap-matches-theirs"
        : scrollTarget === "matches-yours"
          ? "overlap-matches-yours"
          : scrollTarget === "their-all-dups"
            ? "overlap-their-dups-all"
            : scrollTarget === "their-all-missing"
              ? "overlap-their-missing-all"
              : null;
    if (!id) return;
    requestAnimationFrame(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [open, detail, pending, scrollTarget]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,40rem)] max-w-lg flex-col gap-0 overflow-hidden sm:max-w-xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="font-heading text-lg tracking-tight">
            Intercambio con @{peerUsername}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Listas según el álbum declarado y la privacidad del perfil. Coordiná
            en el chat qué pedís y qué ofrecés.
          </DialogDescription>
        </DialogHeader>

        <div className="border-border/50 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t py-4">
          {pending || !detail ? (
            <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
              <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
              Cargando figuritas…
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-[11px] leading-snug">
                Edición{" "}
                <span className="text-foreground font-medium">
                  {detail.albumEdition}
                </span>{" "}
                · Sus repetidas:{" "}
                <span className="tabular-nums">
                  {detail.counts.theirDuplicatesAll}
                </span>{" "}
                tipos · Sus faltas:{" "}
                <span className="tabular-nums">
                  {detail.counts.theirMissingAll}
                </span>
              </p>

              <Section
                id="overlap-matches-theirs"
                title="Ellos te pueden dar"
                description="Sus repetidas que a vos te faltan o tenés priorizadas con ⭐."
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={detail.theirDuplicatesYouNeed.length === 0}
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(
                          rowsToClipboard(detail.theirDuplicatesYouNeed),
                        )
                        .then(
                          () => toast.success("Lista copiada"),
                          () => toast.error("No se pudo copiar"),
                        )
                    }
                  >
                    <ClipboardList className="mr-1 size-3.5" aria-hidden />
                    Copiar
                  </Button>
                }
              >
                <StickerList
                  rows={detail.theirDuplicatesYouNeed}
                  showTradable
                  priorityKey="priorityStar"
                />
              </Section>

              <Section
                id="overlap-matches-yours"
                title="Vos les podés dar"
                description="Tus repetidas que a ellos les faltan (podés ofrecerlas a cambio)."
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={detail.yourDuplicatesTheyNeed.length === 0}
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(
                          rowsToClipboard(detail.yourDuplicatesTheyNeed),
                        )
                        .then(
                          () => toast.success("Lista copiada"),
                          () => toast.error("No se pudo copiar"),
                        )
                    }
                  >
                    <ClipboardList className="mr-1 size-3.5" aria-hidden />
                    Copiar
                  </Button>
                }
              >
                <StickerList
                  rows={detail.yourDuplicatesTheyNeed}
                  showTradable
                  priorityKey="theyPrioritized"
                />
              </Section>

              <section
                id="overlap-their-dups-all"
                className="scroll-mt-4 space-y-2"
              >
                <details className="space-y-2">
                  <summary className="font-heading cursor-pointer text-sm font-semibold tracking-tight">
                    Todas sus repetidas ({detail.theirDuplicatesAll.length})
                  </summary>
                  <p className="text-muted-foreground text-xs leading-snug">
                    Ejemplares de más que declararon; úsalas para armar la
                    propuesta.
                  </p>
                  <StickerList rows={detail.theirDuplicatesAll} showTradable />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 h-8 text-xs"
                    disabled={detail.theirDuplicatesAll.length === 0}
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(rowsToClipboard(detail.theirDuplicatesAll))
                        .then(
                          () => toast.success("Lista copiada"),
                          () => toast.error("No se pudo copiar"),
                        )
                    }
                  >
                    Copiar todas sus repetidas
                  </Button>
                </details>
              </section>

              <section
                id="overlap-their-missing-all"
                className="scroll-mt-4 space-y-2"
              >
                <details className="space-y-2">
                  <summary className="font-heading cursor-pointer text-sm font-semibold tracking-tight">
                    Todas sus faltantes ({detail.theirMissingAll.length})
                  </summary>
                  <p className="text-muted-foreground text-xs leading-snug">
                    Casillas sin «tengo» ni «repetida» en su álbum (según lo
                    marcado).
                  </p>
                  <StickerList
                    rows={detail.theirMissingAll}
                    showTradable={false}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 h-8 text-xs"
                    disabled={detail.theirMissingAll.length === 0}
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(rowsToClipboard(detail.theirMissingAll))
                        .then(
                          () => toast.success("Lista copiada"),
                          () => toast.error("No se pudo copiar"),
                        )
                    }
                  >
                    Copiar todas sus faltantes
                  </Button>
                </details>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
