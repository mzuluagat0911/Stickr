"use client";

import { useMemo, useState } from "react";

import type { SameCityCollector } from "@/lib/discover/same-city";
import { formatDecimalEs, formatIntegerEs } from "@/lib/format-numbers";
import { normalizeAlbumSearchText } from "@/lib/teams/album-search";

import { DiscoverExchangeChatButton } from "@/components/features/discover-exchange-chat-button";
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
type MatchFilter = "all" | "help" | "wish";

export type DiscoverCollectorsListProps = {
  collectors: SameCityCollector[];
};

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
      if (!qNorm) return true;
      const u = normalizeAlbumSearchText(c.username ?? "");
      return u.includes(qNorm);
    });
  }, [collectors, qNorm, matchFilter]);

  return (
    <div className="space-y-4">
      <div className="max-w-2xl space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="discover-collector-search"
            className="text-muted-foreground text-xs font-medium"
          >
            Buscar coleccionista
          </Label>
          <Input
            id="discover-collector-search"
            type="search"
            autoComplete="off"
            placeholder="@usuario o parte del nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md rounded-xl"
          />
          <p className="text-muted-foreground text-[11px] leading-snug md:text-xs">
            Las figuritas concretas las coordinás desde el álbum (prioridad ⭐)
            y el chat; acá filtrás la lista por nombre o por quién te puede
            ayudar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Todos"],
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
        <p className="text-muted-foreground border-muted-foreground/30 rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          No hay coleccionistas con estos filtros. Probá otra búsqueda o «
          Todos».
        </p>
      ) : (
        <ul className="grid min-w-0 gap-4 sm:grid-cols-2 lg:gap-5">
          {filtered.map((c) => (
            <li key={c.otherUserId} className="max-w-full min-w-0">
              <Card className="border-border/70 h-full max-w-full overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="min-w-0 space-y-2 pb-3">
                  <CardTitle className="font-heading min-w-0 truncate text-lg font-semibold tracking-tight">
                    @{c.username}
                  </CardTitle>
                  {c.matchDistinctHelp > 0 ? (
                    <div className="min-w-0 space-y-1">
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
                      Sin cruces por ahora con tus faltas o prioridades (misma
                      edición que la tuya y mismas IDs de catálogo).
                    </p>
                  )}
                </CardHeader>
                <CardContent className="min-w-0 space-y-4 text-sm">
                  <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="bg-muted/50 min-w-0 rounded-xl px-3 py-2.5 sm:px-3.5">
                      <dt className="text-muted-foreground mb-1 text-[0.6875rem] font-medium tracking-wide uppercase">
                        Álbum
                      </dt>
                      <dd className="text-muted-foreground text-base font-semibold tracking-tight sm:text-lg">
                        <span className="text-foreground tabular-nums">
                          {formatDecimalEs(c.albumPercent, 1)}
                        </span>
                        {" % lleno"}
                      </dd>
                    </div>
                    <div className="bg-muted/50 min-w-0 rounded-xl px-3 py-2.5 sm:px-3.5">
                      <dt className="text-muted-foreground mb-1 text-[0.6875rem] font-medium tracking-wide uppercase">
                        Repetidas
                      </dt>
                      <dd className="text-base leading-tight tracking-tight sm:text-lg">
                        <span className="text-foreground tabular-nums">
                          {formatIntegerEs(c.duplicateDistinct)}
                        </span>{" "}
                        <span className="text-muted-foreground text-[0.8125rem] leading-snug font-normal">
                          figurita{c.duplicateDistinct === 1 ? "" : "s"}
                        </span>
                      </dd>
                    </div>
                    <div className="bg-muted/50 min-w-0 rounded-xl px-3 py-2.5 sm:px-3.5">
                      <dt className="text-muted-foreground mb-1 text-[0.6875rem] font-medium tracking-wide uppercase">
                        Para cambiar
                      </dt>
                      <dd className="text-base leading-tight tracking-tight sm:text-lg">
                        <span className="text-foreground tabular-nums">
                          {formatIntegerEs(c.duplicatesForTrade)}
                        </span>{" "}
                        <span className="text-muted-foreground text-[0.8125rem] leading-snug font-normal">
                          ejemplar{c.duplicatesForTrade === 1 ? "" : "es"} de
                          más
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <p className="text-muted-foreground border-border/60 border-t pt-3 text-xs leading-relaxed break-words">
                    Coordina reuniones por los canales configurados cuando haya
                    confianza mutua; en esta vista solo ves datos públicos para
                    orientarte.
                  </p>
                </CardContent>
                {c.matchDistinctHelp > 0 || c.wishlistOverlapDistinct > 0 ? (
                  <CardFooter className="border-border/50 flex min-w-0 flex-col gap-2 border-t pt-4 pb-4 sm:flex-row sm:items-center">
                    <DiscoverExchangeChatButton
                      otherUserId={c.otherUserId}
                      username={c.username?.trim() || "coleccionista"}
                    />
                  </CardFooter>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
