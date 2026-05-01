"use client";

import {
  type ReactNode,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Keyboard,
  LayoutGridIcon,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";

import {
  getUserStickersMapAction,
  markStickerDuplicateAction,
  markStickerHaveAction,
  unmarkStickerAction,
} from "@/app/actions/album";
import {
  getExchangeWantIdsAction,
  toggleExchangeWantAction,
} from "@/app/actions/exchange-wants";
import { computeAlbumProgress } from "@/lib/album/progress";
import {
  formatMissingCsv,
  formatMissingDetailLines,
  formatMissingNumbersOnly,
  listMissingStickers,
} from "@/lib/album/export-missing";
import {
  albumStickersQueryKey,
  exchangeWantsQueryKey,
} from "@/lib/album/query-keys";
import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";
import { formatIntegerEs } from "@/lib/format-numbers";
import { fifaTeamFlagEmoji } from "@/lib/teams/fifa-country";
import { AlbumBulkDialog } from "@/components/album/album-bulk-dialog";
import { AlbumListView } from "@/components/album/album-list-view";
import { AlbumProgressBar } from "@/components/album/album-progress-bar";
import { StickerCell } from "@/components/album/sticker-cell";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Confederation, Team2026 } from "@/scripts/data/teams-2026";
import { TEAMS_2026 } from "@/scripts/data/teams-2026";

const CONF_TAB_ORDER: Confederation[] = [
  "AFC",
  "CAF",
  "CONCACAF",
  "CONMEBOL",
  "OFC",
  "UEFA",
];

type Mut =
  | { op: "have"; stickerId: string }
  | { op: "duplicate"; stickerId: string; count: number }
  | { op: "unmark"; stickerId: string };

function applyMut(
  map: UserStickerMapDTO | undefined,
  m: Mut,
): UserStickerMapDTO {
  const base = { ...(map ?? {}) };
  if (m.op === "unmark") {
    delete base[m.stickerId];
    return base;
  }
  if (m.op === "have") {
    base[m.stickerId] = { status: "have", duplicateCount: 0 };
    return base;
  }
  base[m.stickerId] = { status: "duplicate", duplicateCount: m.count };
  return base;
}

async function runServerMut(m: Mut): Promise<void> {
  if (m.op === "have") {
    const r = await markStickerHaveAction(m.stickerId);
    if (!r.ok) throw new Error(r.message);
    return;
  }
  if (m.op === "unmark") {
    const r = await unmarkStickerAction(m.stickerId);
    if (!r.ok) throw new Error(r.message);
    return;
  }
  const r = await markStickerDuplicateAction(m.stickerId, m.count);
  if (!r.ok) throw new Error(r.message);
}

export type AlbumGridProps = {
  userId: string;
  edition: string;
  catalog: CatalogStickerDTO[];
  initialUserMap: UserStickerMapDTO;
  initialExchangeWantIds: string[];
};

function TeamCollapsible({
  team,
  stickers,
  renderCell,
}: {
  team: Team2026;
  stickers: CatalogStickerDTO[];
  renderCell: (s: CatalogStickerDTO) => ReactNode;
}) {
  return (
    <Collapsible defaultOpen className="rounded-lg border">
      <CollapsibleTrigger className="border-b px-3 py-2 text-sm">
        <span className="font-medium">
          {fifaTeamFlagEmoji(team.code)} {team.name}
        </span>
        <span className="text-muted-foreground mr-2 text-xs">
          ({team.code})
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-2 sm:p-3">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {stickers.map((s) => (
            <Fragment key={s.id}>{renderCell(s)}</Fragment>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AlbumGrid({
  userId,
  edition,
  catalog,
  initialUserMap,
  initialExchangeWantIds,
}: AlbumGridProps) {
  const qc = useQueryClient();
  const key = albumStickersQueryKey(edition, userId);
  const ewKey = exchangeWantsQueryKey(edition, userId);

  const { data: exchangeWantIds = initialExchangeWantIds } = useQuery({
    queryKey: ewKey,
    queryFn: async () => {
      const r = await getExchangeWantIdsAction();
      if (!r.ok) throw new Error(r.message);
      return r.data ?? [];
    },
    initialData: initialExchangeWantIds,
    staleTime: 60_000,
  });

  const wantSet = useMemo(
    () => new Set(exchangeWantIds ?? []),
    [exchangeWantIds],
  );

  const ewMutation = useMutation({
    mutationFn: async (stickerId: string) => {
      const r = await toggleExchangeWantAction(stickerId);
      if (!r.ok) throw new Error(r.message);
      if (r.data === undefined)
        throw new Error("Respuesta incompleta del servidor.");
      return { stickerId, prioritized: r.data.prioritized };
    },
    onSuccess: ({ stickerId, prioritized }) => {
      qc.setQueryData<string[]>(ewKey, (old) => {
        const prev = old ?? [...initialExchangeWantIds];
        if (prioritized) {
          return prev.includes(stickerId) ? prev : [...prev, stickerId];
        }
        return prev.filter((x) => x !== stickerId);
      });
      toast.success(
        prioritized
          ? "Priorizada para Intercambio"
          : "Quitaste la prioridad para Intercambio",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [tab, setTab] = useState("tournament");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const { data: userMap } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const r = await getUserStickersMapAction();
      if (!r.ok) throw new Error(r.message);
      return r.data ?? {};
    },
    initialData: initialUserMap,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (m: Mut) => runServerMut(m),
    onMutate: async (m) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<UserStickerMapDTO>(key);
      qc.setQueryData<UserStickerMapDTO>(key, (old) => applyMut(old, m));
      return { prev };
    },
    onError: (err: Error, _m, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(key, ctx.prev);
      }
      toast.error(err.message || "No se pudo guardar el cambio");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ewKey });
    },
  });

  const stats = useMemo(
    () => computeAlbumProgress(catalog, userMap ?? {}),
    [catalog, userMap],
  );

  const missingForExport = useMemo(
    () => listMissingStickers(catalog, userMap ?? {}),
    [catalog, userMap],
  );

  const refreshAlbumQueries = async () => {
    await qc.invalidateQueries({ queryKey: key });
    await qc.invalidateQueries({ queryKey: ewKey });
  };

  const copyMissingDetail = () => {
    if (missingForExport.length === 0) {
      toast.message("No tienes faltantes en este álbum.");
      return;
    }
    const text = formatMissingDetailLines(missingForExport);
    void navigator.clipboard.writeText(text).then(
      () => toast.success("Faltantes copiados al portapapeles"),
      () => toast.error("No se pudo copiar. Revisa permisos del navegador."),
    );
  };

  const copyMissingNumbers = () => {
    if (missingForExport.length === 0) {
      toast.message("No tienes faltantes en este álbum.");
      return;
    }
    const text = formatMissingNumbersOnly(missingForExport);
    void navigator.clipboard.writeText(text).then(
      () => toast.success("Números copiados"),
      () => toast.error("No se pudo copiar."),
    );
  };

  const downloadMissingCsv = () => {
    if (missingForExport.length === 0) {
      toast.message("No tienes faltantes para exportar.");
      return;
    }
    const csv = formatMissingCsv(missingForExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stickr-faltantes-${edition}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo descargado");
  };

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((s) => {
      const id = s.id.toLowerCase();
      const num = String(s.stickerNumber);
      const team = s.teamCode.toLowerCase();
      const player = (s.playerName ?? "").toLowerCase();
      return (
        id.includes(q) ||
        num.includes(q) ||
        team.includes(q) ||
        player.includes(q)
      );
    });
  }, [catalog, searchQuery]);

  const hasSearch = searchQuery.trim().length > 0;

  const tournament = useMemo(
    () =>
      filteredCatalog.filter(
        (s) =>
          s.teamCode === "FWC" && s.stickerNumber >= 1 && s.stickerNumber <= 15,
      ),
    [filteredCatalog],
  );

  const specials = useMemo(
    () =>
      filteredCatalog.filter(
        (s) =>
          s.teamCode === "FWC" &&
          s.stickerNumber >= 16 &&
          s.stickerNumber <= 83,
      ),
    [filteredCatalog],
  );

  const teamsByConf = useMemo(() => {
    const m = new Map<Confederation, Team2026[]>();
    for (const c of CONF_TAB_ORDER) m.set(c, []);
    for (const t of TEAMS_2026) {
      m.get(t.confederation)!.push(t);
    }
    for (const c of CONF_TAB_ORDER) {
      m.set(
        c,
        (m.get(c) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
    return m;
  }, []);

  const stickerByTeam = useMemo(() => {
    const m = new Map<string, CatalogStickerDTO[]>();
    for (const s of filteredCatalog) {
      if (s.teamCode === "FWC") continue;
      if (!m.has(s.teamCode)) m.set(s.teamCode, []);
      m.get(s.teamCode)!.push(s);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => a.positionInTeam - b.positionInTeam);
    }
    return m;
  }, [filteredCatalog]);

  const orderedIdsForTab = useMemo(() => {
    if (tab === "tournament") return tournament.map((s) => s.id);
    if (tab === "specials") return specials.map((s) => s.id);
    const confLetter = tab.startsWith("conf-")
      ? (tab.slice(5) as Confederation)
      : null;
    if (!confLetter) return [];
    const teams = teamsByConf.get(confLetter) ?? [];
    const ids: string[] = [];
    for (const t of teams) {
      for (const s of stickerByTeam.get(t.code) ?? []) ids.push(s.id);
    }
    return ids;
  }, [tab, tournament, specials, teamsByConf, stickerByTeam]);

  const validFocusId =
    focusedId !== null && orderedIdsForTab.includes(focusedId)
      ? focusedId
      : (orderedIdsForTab[0] ?? null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const ids = orderedIdsForTab;
      if (ids.length === 0) return;
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      const currentId = active.getAttribute("data-sticker-id");
      if (!currentId) return;
      const idx = ids.indexOf(currentId);
      if (idx === -1) return;
      if (!e.shiftKey && idx === ids.length - 1) return;
      if (e.shiftKey && idx === 0) return;
      e.preventDefault();
      const next = e.shiftKey ? idx - 1 : idx + 1;
      const nextId = ids[next]!;
      setFocusedId(nextId);
      cellRefs.current.get(nextId)?.focus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [orderedIdsForTab]);

  const registerRef = (id: string, el: HTMLButtonElement | null) => {
    if (el) cellRefs.current.set(id, el);
    else cellRefs.current.delete(id);
  };

  const makeHandlers = (stickerId: string) => ({
    onCycleForward: () => {
      const cur = userMap?.[stickerId];
      if (!cur) {
        mutation.mutate({ op: "have", stickerId });
        return;
      }
      if (cur.status === "have") {
        mutation.mutate({ op: "duplicate", stickerId, count: 2 });
      }
    },
    onCycleBackward: () => {
      const cur = userMap?.[stickerId];
      if (!cur) return;
      if (cur.status === "duplicate") {
        mutation.mutate({ op: "have", stickerId });
        return;
      }
      if (cur.status === "have") {
        mutation.mutate({ op: "unmark", stickerId });
      }
    },
    onSetHave: () => mutation.mutate({ op: "have", stickerId }),
    onSetDuplicate: (count: number) =>
      mutation.mutate({ op: "duplicate", stickerId, count }),
    onUnmark: () => mutation.mutate({ op: "unmark", stickerId }),
  });

  const renderSticker = (s: CatalogStickerDTO) => {
    const h = makeHandlers(s.id);
    const isMissing = !userMap?.[s.id];
    return (
      <StickerCell
        key={s.id}
        sticker={s}
        entry={userMap?.[s.id]}
        tabIndex={validFocusId === s.id ? 0 : -1}
        onFocus={() => setFocusedId(s.id)}
        registerCell={(el) => registerRef(s.id, el)}
        exchangePriority={wantSet.has(s.id)}
        onToggleExchangePriority={
          isMissing ? () => ewMutation.mutate(s.id) : undefined
        }
        {...h}
      />
    );
  };

  const collected = stats.have + stats.duplicateStickers;
  const pctLabel = `${Math.round(stats.percentCollected * 100)}%`;

  const emptySearchHint =
    hasSearch && filteredCatalog.length === 0 && catalog.length > 0 ? (
      <p
        role="status"
        className="text-muted-foreground py-10 text-center text-sm"
      >
        No hay figuritas que coincidan con tu búsqueda. Prueba con el número,
        código de equipo (p. ej. ARG) o parte del nombre.
      </p>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mi álbum</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
            Pulsa para avanzar el estado: falta → la tengo → repetida. Si está
            repetida, toca la casilla para la cantidad (o elige cantidad en la
            vista lista). En falta puedes priorizar en{" "}
            <Link
              className="text-foreground underline-offset-2 hover:underline"
              href="/discover"
            >
              Intercambio
            </Link>
            , exportar tus faltantes o marcar en lote desde el panel sticky de
            abajo.
          </p>
        </div>
        <Collapsible className="max-w-xl">
          <CollapsibleTrigger className="group inline-flex w-auto rounded-full border px-3 py-1.5">
            <Keyboard className="size-4" aria-hidden />
            Atajos de teclado
            <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-border/70 text-muted-foreground mt-2 rounded-xl border px-4 py-3 text-sm leading-relaxed">
            <ul className="list-inside list-disc space-y-1">
              <li>
                Tab / Shift+Tab para moverte entre figuritas dentro de esta
                pestaña.
              </li>
              <li>
                Espacio cicla estado hacia delante (falta → tengo → repetida);
                Shift+Espacio, al revés.
              </li>
              <li>
                Cuando está en repetida, las teclas 1–9 fijan cantidad ×2–×10.
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>

        <div className="max-w-lg space-y-3">
          <Input
            type="search"
            autoComplete="off"
            aria-label="Buscar en el álbum por código o nombre"
            placeholder="Buscar por número (7), equipo (FWC) o nombre…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Vista
            </span>
            <div className="bg-muted/50 inline-flex gap-0.5 rounded-xl border p-1">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                className="gap-1.5 rounded-lg"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGridIcon className="size-4" aria-hidden />
                Cuadrícula
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                className="gap-1.5 rounded-lg"
                onClick={() => setViewMode("list")}
              >
                <ListChecks className="size-4" aria-hidden />
                Lista
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background/80 supports-backdrop-filter:bg-background/70 sticky top-0 z-20 space-y-3 rounded-xl border p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-foreground text-base leading-snug font-medium tracking-tight">
              Te faltan{" "}
              <span className="tabular-nums">
                {formatIntegerEs(stats.missing)}
              </span>{" "}
              de{" "}
              <span className="tabular-nums">
                {formatIntegerEs(stats.total)}
              </span>{" "}
              figuritas para completar el álbum.
            </p>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <span className="font-semibold">{pctLabel}</span>
              <span className="text-muted-foreground">
                {formatIntegerEs(stats.have)} tengo ·{" "}
                {formatIntegerEs(stats.duplicateStickers)} repetidas ·{" "}
                {formatIntegerEs(stats.missing)} faltan ·{" "}
                {formatIntegerEs(stats.total)} total
              </span>
            </div>
            <AlbumProgressBar stats={stats} />
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Link href="/discover" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
              >
                Ir a Intercambio
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="border-border bg-background/85 hover:bg-muted hover:text-foreground inline-flex h-7 w-full items-center justify-center rounded-[min(var(--radius-md),12px)] border px-2.5 text-[0.8rem] font-medium shadow-[0_1px_2px_0_rgb(20_30_70_/_0.08)] transition-all duration-200 outline-none sm:w-auto">
                Exportar y lote
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem onSelect={() => copyMissingDetail()}>
                  Copiar faltantes (detalle)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => copyMissingNumbers()}>
                  Copiar solo números
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => downloadMissingCsv()}>
                  Descargar CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setBulkOpen(true)}>
                  Marcar en lote…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {viewMode === "grid" && collected === 0 ? (
        <EmptyState
          icon={LayoutGridIcon}
          title="Tu álbum está vacío"
          description="Marca tu primera figurita en la cuadrícula o cambia a la vista lista."
        />
      ) : null}

      {emptySearchHint && viewMode !== "list" ? (
        <div className="border-muted-foreground/35 rounded-xl border border-dashed px-4 py-2">
          {emptySearchHint}
        </div>
      ) : null}

      {viewMode === "list" ? (
        emptySearchHint ? (
          <div className="border-muted-foreground/35 rounded-xl border border-dashed px-4 py-2">
            {emptySearchHint}
          </div>
        ) : (
          <AlbumListView
            catalog={filteredCatalog}
            userMap={userMap ?? {}}
            wantSet={wantSet}
            onToggleWant={(id) => ewMutation.mutate(id)}
            onFalta={(id) => mutation.mutate({ op: "unmark", stickerId: id })}
            onTengo={(id) => mutation.mutate({ op: "have", stickerId: id })}
            onRepetida={(id, c) =>
              mutation.mutate({ op: "duplicate", stickerId: id, count: c })
            }
          />
        )
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <div className="bg-muted/40 max-w-full overflow-x-auto rounded-lg p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList
              variant="line"
              className="flex h-auto min-w-max flex-nowrap gap-0 px-0"
            >
              <TabsTrigger
                value="tournament"
                className="shrink-0 px-3 text-xs sm:text-sm"
              >
                Tournament
              </TabsTrigger>
              <TabsTrigger
                value="specials"
                className="shrink-0 px-3 text-xs sm:text-sm"
              >
                Specials
              </TabsTrigger>
              {CONF_TAB_ORDER.map((c) => (
                <TabsTrigger
                  key={c}
                  value={`conf-${c}`}
                  className="shrink-0 px-3 text-xs sm:text-sm"
                >
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="tournament">
            {emptySearchHint ? null : tournament.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                En esta vista no hay figuritas tournament{" "}
                {hasSearch
                  ? "que coincidan con tu búsqueda"
                  : "en este catálogo"}
                .
              </p>
            ) : (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {tournament.map((s) => renderSticker(s))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="specials">
            {emptySearchHint ? null : specials.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No hay specials para mostrar aquí{" "}
                {hasSearch ? "con ese filtro" : "."}
              </p>
            ) : (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {specials.map((s) => renderSticker(s))}
              </div>
            )}
          </TabsContent>

          {CONF_TAB_ORDER.map((c) => (
            <TabsContent key={c} value={`conf-${c}`} className="space-y-2">
              {emptySearchHint ? null : (teamsByConf.get(c) ?? []).every(
                  (team) => (stickerByTeam.get(team.code) ?? []).length === 0,
                ) ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Ningún equipo tiene figuritas aquí{" "}
                  {hasSearch ? "con tu búsqueda" : "en esta vista"}.
                </p>
              ) : (
                (teamsByConf.get(c) ?? []).map((team) => (
                  <TeamCollapsible
                    key={team.code}
                    team={team}
                    stickers={stickerByTeam.get(team.code) ?? []}
                    renderCell={renderSticker}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <AlbumBulkDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        catalogEdition={catalog}
        onCommitted={refreshAlbumQueries}
      />
    </div>
  );
}
