"use client";

import countries from "i18n-iso-countries";
import es from "i18n-iso-countries/langs/es.json";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { SameCityCollector } from "@/lib/discover/same-city";
import { formatDecimalEs, formatIntegerEs } from "@/lib/format-numbers";
import { normalizeAlbumSearchText } from "@/lib/teams/album-search";

import { DiscoverExchangeChatButton } from "@/components/features/discover-exchange-chat-button";
import { DiscoverWhatsAppContact } from "@/components/features/discover-whatsapp-contact";
import {
  DiscoverTradeOverlapModal,
  type DiscoverOverlapScrollTarget,
} from "@/components/features/discover-trade-overlap-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

countries.registerLocale(es as import("i18n-iso-countries").LocaleData);

type MatchFilter = "all" | "help" | "wish" | "same_city";

function cityLabel(c: SameCityCollector): string {
  const city = c.city.trim();
  if (!city) return "Sin ciudad";
  const country =
    c.countryCode && countries.getName(c.countryCode, "es")
      ? countries.getName(c.countryCode, "es")
      : c.countryCode;
  return country ? `${city}, ${country}` : city;
}

export type DiscoverCollectorsListProps = {
  collectors: SameCityCollector[];
};

const statBtnClass =
  "bg-muted/50 hover:bg-muted/85 focus-visible:ring-ring min-w-0 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-3.5";

function DiscoverCollectorCard({ c }: { c: SameCityCollector }) {
  const uname = c.username?.trim() || "coleccionista";
  const [overlapOpen, setOverlapOpen] = useState(false);
  const [overlapScroll, setOverlapScroll] =
    useState<DiscoverOverlapScrollTarget>("top");

  const openOverlap = (scroll: DiscoverOverlapScrollTarget) => {
    setOverlapScroll(scroll);
    setOverlapOpen(true);
  };

  const priorityMatch = c.wishlistOverlapDistinct > 0;
  const hasExchangeOverlap =
    c.matchDistinctHelp > 0 || c.wishlistOverlapDistinct > 0;

  return (
    <>
      <Card
        className={cn(
          "border-border/70 h-full max-w-full overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-md",
          priorityMatch && "ring-primary/35 border-primary/25 shadow-md ring-2",
          !priorityMatch && hasExchangeOverlap && "ring-primary/15 ring-1",
        )}
      >
        <CardHeader className="min-w-0 space-y-2 pb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CardTitle className="font-heading min-w-0 truncate text-lg font-semibold tracking-tight">
              @{c.username}
            </CardTitle>
            <span
              className={cn(
                "inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-medium tracking-wide",
                c.isSameCity
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-zinc-200/90 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200",
              )}
              title={cityLabel(c)}
            >
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{cityLabel(c)}</span>
            </span>
            {priorityMatch ? (
              <span className="bg-primary/14 text-primary shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide uppercase">
                Coincidencia ⭐
              </span>
            ) : null}
          </div>
          {hasExchangeOverlap ? (
            <div className="min-w-0 space-y-1">
              {c.matchDistinctHelp > 0 ? (
                <p className="text-primary text-sm leading-snug font-semibold break-words">
                  Repetidas que te sirven:{" "}
                  <span className="tabular-nums">
                    {formatIntegerEs(c.matchDistinctHelp)}
                  </span>{" "}
                  tipos distintos ·{" "}
                  <span className="tabular-nums">
                    {formatIntegerEs(c.matchTradableQty)}
                  </span>{" "}
                  ejemplares de más disponibles
                </p>
              ) : (
                <p className="text-primary text-sm leading-snug font-semibold break-words">
                  Hay cruces con figuritas que marcaste como prioridad en el
                  álbum.
                </p>
              )}
              {c.wishlistOverlapDistinct > 0 ? (
                <p className="text-muted-foreground text-xs break-words">
                  <span className="text-foreground font-medium tabular-nums">
                    {formatIntegerEs(c.wishlistOverlapDistinct)}
                  </span>{" "}
                  en tu lista prioritaria (⭐ en el álbum)
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs leading-relaxed break-words">
              Sin cruces automáticos con tus faltas o prioridades (misma edición
              de álbum). Igual podés abrir el detalle para ver sus repetidas y
              faltantes.
            </p>
          )}
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 text-sm">
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              className={statBtnClass}
              aria-label={`Álbum de ${uname}: ${formatDecimalEs(c.albumPercent, 1)} por ciento. Ver detalle de figuritas.`}
              onClick={() => openOverlap("top")}
            >
              <span className="text-muted-foreground mb-1 block text-[0.6875rem] font-medium tracking-wide uppercase">
                Álbum
              </span>
              <span className="text-muted-foreground block text-base leading-tight font-semibold tracking-tight sm:text-lg">
                <span className="text-foreground tabular-nums">
                  {formatDecimalEs(c.albumPercent, 1)}
                </span>
                {" % lleno"}
              </span>
              <span className="text-primary mt-1 block text-[0.65rem] font-medium">
                Ver listas
              </span>
            </button>
            <button
              type="button"
              className={statBtnClass}
              aria-label={`Repetidas de ${uname}: ${formatIntegerEs(c.duplicateDistinct)} tipos. Ver cuáles son.`}
              onClick={() => openOverlap("their-all-dups")}
            >
              <span className="text-muted-foreground mb-1 block text-[0.6875rem] font-medium tracking-wide uppercase">
                Repetidas
              </span>
              <span className="block text-base leading-tight tracking-tight sm:text-lg">
                <span className="text-foreground tabular-nums">
                  {formatIntegerEs(c.duplicateDistinct)}
                </span>{" "}
                <span className="text-muted-foreground text-[0.8125rem] leading-snug font-normal">
                  figurita{c.duplicateDistinct === 1 ? "" : "s"}
                </span>
              </span>
              <span className="text-primary mt-1 block text-[0.65rem] font-medium">
                Ver cuáles · cruces
              </span>
            </button>
            <button
              type="button"
              className={statBtnClass}
              aria-label={`Para cambiar de ${uname}: ${formatIntegerEs(c.duplicatesForTrade)} ejemplares de más`}
              onClick={() => openOverlap("matches-theirs")}
            >
              <span className="text-muted-foreground mb-1 block text-[0.6875rem] font-medium tracking-wide uppercase">
                Para cambiar
              </span>
              <span className="block text-base leading-tight tracking-tight sm:text-lg">
                <span className="text-foreground tabular-nums">
                  {formatIntegerEs(c.duplicatesForTrade)}
                </span>{" "}
                <span className="text-muted-foreground text-[0.8125rem] leading-snug font-normal">
                  ejemplar{c.duplicatesForTrade === 1 ? "" : "es"} de más
                </span>
              </span>
              <span className="text-primary mt-1 block text-[0.65rem] font-medium">
                Ellos → vos
              </span>
            </button>
          </div>
          <div className="border-border/60 flex flex-wrap gap-x-3 gap-y-1 border-t pt-3">
            <button
              type="button"
              className="text-primary text-xs font-medium underline-offset-2 hover:underline"
              onClick={() => openOverlap("their-all-missing")}
            >
              Ver sus faltantes
            </button>
            <button
              type="button"
              className="text-primary text-xs font-medium underline-offset-2 hover:underline"
              onClick={() => openOverlap("matches-yours")}
            >
              Tus repetidas que les faltan
            </button>
            <button
              type="button"
              className="text-primary text-xs font-medium underline-offset-2 hover:underline"
              onClick={() => openOverlap("matches-theirs")}
            >
              Sus repetidas que te faltan
            </button>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed break-words">
            Coordiná por chat o canales externos cuando haya confianza mutua.
          </p>
        </CardContent>
        <CardFooter
          className={cn(
            "border-border/50 flex min-w-0 flex-col gap-2 border-t pt-4 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
            !hasExchangeOverlap && "sm:justify-end",
          )}
        >
          {hasExchangeOverlap ? (
            <DiscoverExchangeChatButton
              otherUserId={c.otherUserId}
              username={uname}
            />
          ) : null}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end">
            <DiscoverWhatsAppContact
              otherUserId={c.otherUserId}
              username={uname}
              peerDisplayName={c.peerDisplayName}
              showChatWhenLocked={!hasExchangeOverlap}
              contact={{
                whatsappE164: c.whatsappE164,
                whatsappLocked: c.whatsappLocked,
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full shrink-0 rounded-xl sm:w-auto"
              onClick={() => openOverlap("matches-theirs")}
            >
              Figuritas y cruces
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full shrink-0 rounded-xl sm:w-auto"
              asChild
            >
              <Link href="/album">Álbum y prioridades ⭐</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
      <DiscoverTradeOverlapModal
        open={overlapOpen}
        onOpenChange={setOverlapOpen}
        peerUserId={c.otherUserId}
        peerUsername={uname}
        scrollTarget={overlapScroll}
      />
    </>
  );
}

export function DiscoverCollectorsList({
  collectors,
}: DiscoverCollectorsListProps) {
  const [query, setQuery] = useState("");
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");

  const qNorm = normalizeAlbumSearchText(query.trim());

  const filtered = useMemo(() => {
    return collectors.filter((c) => {
      if (matchFilter === "help" && c.matchDistinctHelp <= 0) return false;
      if (matchFilter === "wish" && c.wishlistOverlapDistinct <= 0)
        return false;
      if (matchFilter === "same_city" && !c.isSameCity) return false;
      if (!qNorm) return true;
      const u = normalizeAlbumSearchText(c.username ?? "");
      const city = normalizeAlbumSearchText(c.city ?? "");
      return u.includes(qNorm) || city.includes(qNorm);
    });
  }, [collectors, qNorm, matchFilter]);

  return (
    <div className="space-y-4">
      <div className="max-w-2xl space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="discover-collector-search"
            className="text-xs font-medium text-zinc-800 dark:text-zinc-100"
          >
            Buscar coleccionista
          </Label>
          <Input
            id="discover-collector-search"
            type="search"
            autoComplete="off"
            placeholder="@usuario, ciudad o parte del nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md rounded-xl border-zinc-200 bg-white text-zinc-900 shadow-sm placeholder:text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          />
          <p className="text-[11px] leading-snug text-zinc-600 md:text-xs dark:text-zinc-300">
            Las figuritas concretas las coordinás desde el álbum (prioridad ⭐)
            y el chat; acá filtrás la lista por nombre o por quién te puede
            ayudar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Todos"],
              ["same_city", "Mi ciudad"],
              ["help", "Con repetidas que te sirven"],
              ["wish", "Con prioridad ⭐"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={matchFilter === id ? "secondary" : "outline"}
              className="h-9 shrink-0 rounded-full px-3.5 text-xs sm:h-8"
              onClick={() => setMatchFilter(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-700 dark:border-zinc-600 dark:text-zinc-300">
          No hay coleccionistas con estos filtros. Probá otra búsqueda o «
          Todos».
        </p>
      ) : (
        <ul className="grid min-w-0 gap-4 sm:grid-cols-2 lg:gap-5">
          {filtered.map((c) => (
            <li key={c.otherUserId} className="max-w-full min-w-0">
              <DiscoverCollectorCard c={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
