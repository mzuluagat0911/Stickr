"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";

import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";
import { formatIntegerEs } from "@/lib/format-numbers";
import { fifaTeamFlagEmoji } from "@/lib/teams/fifa-country";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEAMS_2026 } from "@/scripts/data/teams-2026";
import { cn } from "@/lib/utils";

const TEAM_NAME = new Map(TEAMS_2026.map((t) => [t.code, t.name] as const));

function teamLabel(code: string): string {
  if (code === "FWC") return "Especiales / FWC";
  return TEAM_NAME.get(code) ?? code;
}

function stickerLabel(s: CatalogStickerDTO): string {
  const n = (s.playerName ?? "").trim();
  if (n) return n;
  return (s.type ?? "").trim() || "—";
}

export type ListFilter = "all" | "missing" | "duplicate_trade" | "priority";

export type AlbumListViewProps = {
  catalog: CatalogStickerDTO[];
  userMap: UserStickerMapDTO;
  wantSet: Set<string>;
  onToggleWant: (stickerId: string) => void;
  onFalta: (stickerId: string) => void;
  onTengo: (stickerId: string) => void;
  onRepetida: (stickerId: string, count: number) => void;
};

export function AlbumListView({
  catalog,
  userMap,
  wantSet,
  onToggleWant,
  onFalta,
  onTengo,
  onRepetida,
}: AlbumListViewProps) {
  const [filter, setFilter] = useState<ListFilter>("all");

  const rows = useMemo(() => {
    const sorted = [...catalog].sort(
      (a, b) => a.stickerNumber - b.stickerNumber,
    );
    if (filter === "all") return sorted;
    return sorted.filter((s) => {
      const entry = userMap[s.id];
      const isMissing = !entry;
      if (filter === "missing") return isMissing;
      if (filter === "duplicate_trade") return entry?.status === "duplicate";
      if (filter === "priority") return isMissing && wantSet.has(s.id);
      return true;
    });
  }, [catalog, filter, userMap, wantSet]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Ver
        </span>
        {(
          [
            ["all", "Todas"] as const,
            ["missing", "Solo faltantes"] as const,
            ["duplicate_trade", "Repetidas disponibles"] as const,
            ["priority", "Prioridad intercambio"] as const,
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={filter === key ? "secondary" : "outline"}
            className="h-8 rounded-full text-xs"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {formatIntegerEs(rows.length)} {rows.length === 1 ? "fila" : "filas"}
        </span>
      </div>

      <div className="rounded-xl border md:max-h-[min(70vh,720px)] md:overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/80 border-border border-b backdrop-blur-sm md:sticky md:top-0 md:z-[1]">
            <tr>
              <th className="px-2 py-2 font-medium sm:px-3">Nº</th>
              <th className="px-2 py-2 font-medium sm:px-3">Equipo</th>
              <th className="px-2 py-2 font-medium sm:px-3">Figurita</th>
              <th className="px-2 py-2 font-medium sm:px-3">Estado</th>
              <th className="hidden px-2 py-2 font-medium sm:px-3 md:table-cell">
                Int.
              </th>
              <th className="px-2 py-2 text-right font-medium sm:px-3">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="text-muted-foreground px-3 py-8 text-center"
                  colSpan={6}
                >
                  No hay figuritas con este filtro. Cambia «Ver» o la búsqueda
                  arriba.
                </td>
              </tr>
            ) : (
              rows.map((s) => {
                const entry = userMap[s.id];
                const missing = !entry;
                let stateLabel = "Falta";
                let badgeVariant: "secondary" | "outline" | "default" =
                  "outline";
                if (entry?.status === "have") {
                  stateLabel = "La tengo";
                  badgeVariant = "secondary";
                } else if (entry?.status === "duplicate") {
                  const total = Math.max(2, entry.duplicateCount || 2);
                  stateLabel = `Repetida ×${total}`;
                  badgeVariant = "default";
                }

                const prioBtn = missing ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={wantSet.has(s.id) ? "secondary" : "ghost"}
                    className={cn(
                      "shrink-0 rounded-full",
                      wantSet.has(s.id) && "text-amber-700 dark:text-amber-400",
                    )}
                    aria-label={
                      wantSet.has(s.id)
                        ? "Quitar prioridad en Intercambio"
                        : "Priorizar en Intercambio"
                    }
                    title="Prioridad en Intercambio"
                    onClick={() => onToggleWant(s.id)}
                  >
                    <Star
                      className={cn(
                        "size-4",
                        wantSet.has(s.id) && "fill-current",
                      )}
                    />
                  </Button>
                ) : null;

                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-border/60 border-b last:border-0",
                      missing &&
                        wantSet.has(s.id) &&
                        "bg-amber-500/5 dark:bg-amber-500/10",
                    )}
                  >
                    <td className="px-2 py-1.5 tabular-nums sm:px-3">
                      <span className="font-semibold">{s.stickerNumber}</span>
                      <span className="text-muted-foreground mx-1">·</span>
                      <span className="text-muted-foreground text-xs">
                        {s.id}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 sm:px-3">
                      <div className="max-w-[8rem] truncate font-medium">
                        {fifaTeamFlagEmoji(s.teamCode)} {teamLabel(s.teamCode)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {s.teamCode}
                      </div>
                    </td>
                    <td className="max-w-[12rem] truncate px-2 py-1.5 sm:max-w-none sm:px-3">
                      {stickerLabel(s)}
                    </td>
                    <td className="px-2 py-1.5 sm:px-3">
                      <Badge variant={badgeVariant} className="font-normal">
                        {stateLabel}
                      </Badge>
                    </td>
                    <td className="hidden px-2 py-1.5 sm:px-3 md:table-cell">
                      {prioBtn ?? (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right sm:px-3">
                      <div className="flex flex-wrap items-center justify-end gap-1 md:justify-end">
                        <div className="mr-auto flex shrink-0 items-center md:hidden">
                          {prioBtn}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => onFalta(s.id)}
                        >
                          Falta
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => onTengo(s.id)}
                        >
                          Tengo
                        </Button>
                        {entry?.status === "duplicate" ? (
                          <Select
                            value={String(
                              Math.max(2, entry.duplicateCount || 2),
                            )}
                            onValueChange={(v) => onRepetida(s.id, Number(v))}
                          >
                            <SelectTrigger
                              size="sm"
                              className="h-7 w-[4.5rem] text-xs"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 9 }, (_, i) => i + 2).map(
                                (n) => (
                                  <SelectItem key={n} value={String(n)}>
                                    ×{n}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                            onClick={() => onRepetida(s.id, 2)}
                          >
                            Rep.×2
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
