"use client";

import {
  type ReactNode,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
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
import {
  getTeamSearchBlobMap,
  stickerMatchesAlbumSearch,
} from "@/lib/teams/album-search";
import { AlbumBulkDialog } from "@/components/album/album-bulk-dialog";
import { AlbumPaniniFrame } from "@/components/album/album-panini-frame";
import { AlbumProgressBar } from "@/components/album/album-progress-bar";
import { StickerCell } from "@/components/album/sticker-cell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Team2026 } from "@/scripts/data/teams-2026";
import {
  WORLD_CUP_2026_ALBUM_GROUPS,
  albumTabIdForTeamCode,
} from "@/scripts/data/teams-2026";

/** Figuritas FWC del bloque intro (n.º globales 1–20 en catálogo). */
const FWC_INTRO_MAX = 20;

const ALBUM_SECTION_OPTIONS: { value: string; label: string }[] = [
  { value: "intro", label: "Intro (FWC)" },
  ...WORLD_CUP_2026_ALBUM_GROUPS.map((g) => ({
    value: `group-${g.letter}`,
    label: `Grupo ${g.letter}`,
  })),
  { value: "museum", label: "Museo (historia)" },
];

const albumTabTriggerClass =
  "max-w-max shrink-0 grow-0 basis-auto rounded-lg px-3 py-2.5 text-xs font-semibold tracking-tight transition-[color,background-color,box-shadow] duration-200 hover:bg-background/55 hover:text-foreground sm:min-h-9 sm:px-4 sm:py-2 sm:text-sm";

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

type AlbumStatusFilter = "all" | "missing" | "have" | "duplicate" | "priority";

function applyAlbumFilters(
  catalog: CatalogStickerDTO[],
  searchInput: string,
  teamSearchBlobs: ReadonlyMap<string, string>,
  statusFilter: AlbumStatusFilter,
  userMap: UserStickerMapDTO | undefined,
  wantSet: Set<string>,
): CatalogStickerDTO[] {
  const qRaw = searchInput.trim();
  const bySearch = !qRaw
    ? catalog
    : catalog.filter((s) =>
        stickerMatchesAlbumSearch(s, searchInput, teamSearchBlobs),
      );
  if (statusFilter === "all") return bySearch;
  return bySearch.filter((s) => {
    const entry = userMap?.[s.id];
    if (statusFilter === "missing") return !entry;
    if (statusFilter === "have") return entry?.status === "have";
    if (statusFilter === "duplicate") return entry?.status === "duplicate";
    return !entry && wantSet.has(s.id);
  });
}

function pickAlbumSearchTab(filtered: CatalogStickerDTO[]): string | null {
  for (const s of filtered) {
    if (
      s.teamCode === "FWC" &&
      s.stickerNumber >= 1 &&
      s.stickerNumber <= FWC_INTRO_MAX
    ) {
      return "intro";
    }
    if (s.teamCode === "MUSEUM") {
      return "museum";
    }
    const tabId = albumTabIdForTeamCode(s.teamCode);
    if (tabId) return tabId;
  }
  return null;
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
  const n = stickers.length;
  return (
    <Collapsible
      defaultOpen={false}
      className="border-border/55 bg-card/35 hover:border-border dark:bg-card/15 rounded-xl border shadow-sm transition-[box-shadow,background-color] duration-200 hover:shadow-md"
    >
      <CollapsibleTrigger className="min-h-12 w-full px-3 py-2.5 text-left sm:min-h-11 sm:px-4">
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="text-lg leading-none select-none" aria-hidden>
            {fifaTeamFlagEmoji(team.code)}
          </span>
          <span className="text-foreground min-w-0 flex-1 truncate font-semibold tracking-tight">
            {team.name}
          </span>
          <span
            className="text-muted-foreground border-border/50 bg-muted/50 inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 font-mono text-[10px] tabular-nums sm:px-2"
            title={`${n} figurita${n === 1 ? "" : "s"} en este equipo`}
          >
            {n}
          </span>
          <span className="text-muted-foreground border-border/45 bg-muted/45 shrink-0 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide">
            {team.code}
          </span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border/40 bg-muted/20 dark:bg-muted/10 border-t p-2 sm:p-3">
        <div className="grid grid-cols-4 gap-1.5 min-[420px]:grid-cols-5 sm:gap-2">
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

  const [tab, setTab] = useState("intro");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "missing" | "have" | "duplicate" | "priority"
  >("all");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const teamSearchBlobs = useMemo(() => getTeamSearchBlobMap(), []);

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

  const onSearchQueryChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (!value.trim()) return;
      const filtered = applyAlbumFilters(
        catalog,
        value,
        teamSearchBlobs,
        statusFilter,
        userMap,
        wantSet,
      );
      const next = pickAlbumSearchTab(filtered);
      if (next) setTab(next);
    },
    [catalog, teamSearchBlobs, statusFilter, userMap, wantSet],
  );

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

  const filteredCatalog = useMemo(
    () =>
      applyAlbumFilters(
        catalog,
        searchQuery,
        teamSearchBlobs,
        statusFilter,
        userMap,
        wantSet,
      ),
    [catalog, searchQuery, statusFilter, userMap, wantSet, teamSearchBlobs],
  );

  const hasSearch = searchQuery.trim().length > 0;

  const introFwc = useMemo(
    () =>
      filteredCatalog
        .filter(
          (s) =>
            s.teamCode === "FWC" &&
            s.stickerNumber >= 1 &&
            s.stickerNumber <= FWC_INTRO_MAX,
        )
        .sort((a, b) => a.stickerNumber - b.stickerNumber),
    [filteredCatalog],
  );

  const museum = useMemo(
    () =>
      filteredCatalog
        .filter((s) => s.teamCode === "MUSEUM")
        .sort((a, b) => a.stickerNumber - b.stickerNumber),
    [filteredCatalog],
  );

  const stickerByTeam = useMemo(() => {
    const m = new Map<string, CatalogStickerDTO[]>();
    for (const s of filteredCatalog) {
      if (s.teamCode === "FWC" || s.teamCode === "MUSEUM") continue;
      if (!m.has(s.teamCode)) m.set(s.teamCode, []);
      m.get(s.teamCode)!.push(s);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => a.positionInTeam - b.positionInTeam);
    }
    return m;
  }, [filteredCatalog]);

  const orderedIdsForTab = useMemo(() => {
    if (tab === "intro") return introFwc.map((s) => s.id);
    if (tab === "museum") return museum.map((s) => s.id);
    if (!tab.startsWith("group-")) return [];
    const letter = tab.slice(6);
    const group = WORLD_CUP_2026_ALBUM_GROUPS.find((g) => g.letter === letter);
    if (!group) return [];
    const ids: string[] = [];
    for (const t of group.teams) {
      for (const s of stickerByTeam.get(t.code) ?? []) ids.push(s.id);
    }
    return ids;
  }, [tab, introFwc, museum, stickerByTeam]);

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
    <>
      <AlbumPaniniFrame>
        <div className="bg-background/75 dark:bg-background/60 max-w-full min-w-0 space-y-6 rounded-2xl border border-zinc-200/55 px-2.5 py-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm min-[400px]:px-3 sm:rounded-3xl sm:px-5 sm:py-6 sm:shadow-md dark:border-zinc-800/60 dark:ring-white/[0.04]">
          <div className="space-y-4">
            <div className="min-w-0">
              <p className="text-muted-foreground mb-1.5 line-clamp-2 max-w-full text-[0.625rem] leading-snug font-semibold tracking-[0.16em] break-words uppercase sm:line-clamp-none sm:text-[0.6875rem] sm:tracking-[0.2em]">
                FIFA World Cup 2026 · {edition}
              </p>
              <h1 className="text-2xl font-black tracking-tight text-balance text-zinc-900 sm:text-3xl dark:text-zinc-50">
                Mi álbum
              </h1>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
                <span className="md:hidden">
                  Toca una casilla para avanzar: falta → tengo → repetida. En
                  falta, la estrella arriba a la derecha prioriza para{" "}
                  <Link
                    className="text-foreground font-medium underline-offset-2 hover:underline"
                    href="/discover"
                  >
                    Intercambio
                  </Link>
                  . Exportar va en el panel de abajo.
                </span>
                <span className="hidden md:inline">
                  Pulsa para avanzar el estado: falta → la tengo → repetida. Si
                  está repetida, toca la casilla para elegir la cantidad. En
                  falta, la estrella arriba a la derecha prioriza para{" "}
                  <Link
                    className="text-foreground underline-offset-2 hover:underline"
                    href="/discover"
                  >
                    Intercambio
                  </Link>
                  ; también puedes filtrar por «Prioridad» o usar el menú
                  contextual. Exportar faltantes y marcar en lote van en el
                  panel sticky de abajo.
                </span>
              </p>
            </div>
            <div className="max-w-lg space-y-3">
              <div className="relative">
                <Input
                  type="search"
                  autoComplete="off"
                  aria-label="Buscar en el álbum por código o nombre"
                  placeholder="Buscar por número (7), equipo (FWC) o nombre…"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  className={searchQuery.trim() ? "pr-10" : undefined}
                />
                {searchQuery.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 rounded-lg"
                    aria-label="Limpiar búsqueda"
                    onClick={() => onSearchQueryChange("")}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">
                  Estado
                </span>
                <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                  {(
                    [
                      ["all", "Todas"],
                      ["missing", "Faltantes"],
                      ["priority", "Prioridad"],
                      ["have", "Tengo"],
                      ["duplicate", "Repetidas"],
                    ] as const
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={statusFilter === value ? "secondary" : "outline"}
                      className="h-9 shrink-0 rounded-full px-3.5 text-xs sm:h-7"
                      onClick={() =>
                        setStatusFilter(
                          value as
                            | "all"
                            | "missing"
                            | "have"
                            | "duplicate"
                            | "priority",
                        )
                      }
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-background/80 supports-backdrop-filter:bg-background/70 sticky top-0 z-30 space-y-3 rounded-xl border p-4 shadow-sm backdrop-blur-md">
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

          {emptySearchHint ? (
            <div className="border-muted-foreground/35 rounded-xl border border-dashed px-4 py-2">
              {emptySearchHint}
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <div className="space-y-1.5 md:hidden">
              <Label
                htmlFor="album-section-select"
                className="text-muted-foreground text-xs font-medium"
              >
                Sección del álbum
              </Label>
              <Select value={tab} onValueChange={setTab}>
                <SelectTrigger
                  id="album-section-select"
                  className="border-border/60 bg-background h-11 w-full rounded-xl px-3 shadow-sm"
                >
                  <SelectValue placeholder="Elige una sección" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  className="max-h-[min(70vh,22rem)] min-w-[var(--radix-select-trigger-width)]"
                >
                  {ALBUM_SECTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-[11px] leading-snug">
                En pantalla grande también puedes usar las pestañas
                horizontales.
              </p>
            </div>

            <div
              className="border-border/50 bg-muted/45 hidden max-w-full overflow-x-auto rounded-2xl border p-1.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.05)] [-ms-overflow-style:none] [scrollbar-width:thin] md:block md:scroll-px-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-0 md:[&::-webkit-scrollbar]:hidden"
              role="region"
              aria-label="Secciones del álbum (vista ancha)"
            >
              <TabsList className="bg-muted/70 text-muted-foreground ring-border/35 dark:bg-muted/40 dark:ring-border/20 flex h-auto min-w-max flex-nowrap gap-1 rounded-xl p-1 ring-1 sm:gap-1.5">
                <TabsTrigger
                  value="intro"
                  title="Intro Panini (FWC): escudo, trofeo, mascota, sedes (n.º 1–20 en catálogo)"
                  className={albumTabTriggerClass}
                >
                  Intro
                </TabsTrigger>
                {WORLD_CUP_2026_ALBUM_GROUPS.map((g) => (
                  <TabsTrigger
                    key={g.letter}
                    value={`group-${g.letter}`}
                    title={`Grupo ${g.letter}: ${g.teams.map((t) => t.name).join(", ")}`}
                    className={albumTabTriggerClass}
                  >
                    {g.letter}
                  </TabsTrigger>
                ))}
                <TabsTrigger
                  value="museum"
                  title="Museo / historia (campeones)"
                  className={albumTabTriggerClass}
                >
                  Museo
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="intro">
              {emptySearchHint ? null : introFwc.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No hay figuritas de intro FWC{" "}
                  {hasSearch
                    ? "que coincidan con tu búsqueda"
                    : "en este catálogo"}
                  .
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Bloque inicial Panini (FWC): escudo, trofeo, mascota, balón,
                    sedes anfitrionas y resto del tramo intro según catálogo
                    digital.
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 min-[420px]:grid-cols-5 sm:gap-2">
                    {introFwc.map((s) => renderSticker(s))}
                  </div>
                </div>
              )}
            </TabsContent>

            {WORLD_CUP_2026_ALBUM_GROUPS.map((g) => (
              <TabsContent
                key={g.letter}
                value={`group-${g.letter}`}
                className="space-y-3"
              >
                {emptySearchHint ? null : g.teams.every(
                    (team) => (stickerByTeam.get(team.code) ?? []).length === 0,
                  ) ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    Ningún equipo de este grupo tiene figuritas aquí{" "}
                    {hasSearch ? "con tu búsqueda" : "en esta vista"}.
                  </p>
                ) : (
                  <>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      <span className="text-foreground font-medium">
                        Grupo {g.letter}
                      </span>
                      {": "}
                      {g.teams
                        .map((t) => `${fifaTeamFlagEmoji(t.code)} ${t.name}`)
                        .join(" · ")}
                    </p>
                    <div className="space-y-2">
                      {g.teams.map((team) => (
                        <TeamCollapsible
                          key={team.code}
                          team={team}
                          stickers={stickerByTeam.get(team.code) ?? []}
                          renderCell={renderSticker}
                        />
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            ))}

            <TabsContent value="museum">
              {emptySearchHint ? null : museum.length === 0 ? (
                <div className="text-muted-foreground space-y-2 py-8 text-center text-sm leading-relaxed">
                  <p>
                    Este catálogo aún no incluye el bloque Museo (10 figuritas).
                  </p>
                  <p>
                    Ejecutá{" "}
                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                      pnpm seed:catalog
                    </code>{" "}
                    contra tu base para cargar n.º 981–990 (MUSEUM).
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    En el álbum Panini, los campeones históricos van al final
                    como FWC9– FWC19 (11 figuritas). Aquí usamos el bloque
                    MUSEUM del catálogo digital (n.º{" "}
                    {museum[0]?.stickerNumber ?? "981"}–
                    {museum.at(-1)?.stickerNumber}).
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 min-[420px]:grid-cols-5 sm:max-w-md sm:gap-2">
                    {museum.map((s) => renderSticker(s))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AlbumPaniniFrame>
      <AlbumBulkDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        catalogEdition={catalog}
        onCommitted={refreshAlbumQueries}
      />
    </>
  );
}
