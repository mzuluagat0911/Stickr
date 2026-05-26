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
import {
  computeAlbumProgress,
  type TeamProgressSlice,
} from "@/lib/album/progress";
import {
  formatStickerNumbersWhatsApp,
  formatStickersCsv,
  formatStickersTxt,
  formatStickersWhatsApp,
  listDuplicateStickers,
  listHaveStickers,
  listMissingStickers,
  type StickerExportCategory,
} from "@/lib/album/export-missing";
import {
  albumStickersQueryKey,
  exchangeWantsQueryKey,
} from "@/lib/album/query-keys";
import {
  FWC_INTRO_CATALOG_MAX,
  FWC_INTRO_CATALOG_MIN,
  catalogSlotLabel,
  catalogStickerDisplayLabel,
} from "@/lib/album/slot-label";
import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";
import { formatIntegerEs } from "@/lib/format-numbers";
import { fifaTeamFlagEmoji } from "@/lib/teams/fifa-country";
import {
  getTeamSearchBlobMap,
  stickerMatchesAlbumSearch,
} from "@/lib/teams/album-search";
import { cn } from "@/lib/utils";
import { AlbumBulkDialog } from "@/components/album/album-bulk-dialog";
import { AlbumProgressBar } from "@/components/album/album-progress-bar";
import { StickerCell } from "@/components/album/sticker-cell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import type { Team2026 } from "@/scripts/data/teams-2026";
import {
  WORLD_CUP_2026_ALBUM_GROUPS,
  albumTabIdForTeamCode,
} from "@/scripts/data/teams-2026";

const ALBUM_SECTION_OPTIONS: { value: string; label: string }[] = [
  { value: "intro", label: "Intro (FWC)" },
  ...WORLD_CUP_2026_ALBUM_GROUPS.map((g) => ({
    value: `group-${g.letter}`,
    label: `Grupo ${g.letter}`,
  })),
  { value: "museum", label: "Museo (historia)" },
];

const albumTabTriggerClass =
  "max-w-max shrink-0 grow-0 basis-auto rounded-xl px-3 py-2.5 text-xs font-semibold tracking-tight text-zinc-700 transition-[color,background-color,box-shadow] duration-200 hover:bg-white/90 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800/90 dark:hover:text-white sm:min-h-9 sm:px-4 sm:py-2 sm:text-sm";

type Mut =
  | { op: "have"; stickerId: string }
  | { op: "duplicate"; stickerId: string; count: number }
  | { op: "unmark"; stickerId: string };

function normalizeToken(t: string): string {
  return t.trim().replace(/\s+/g, " ");
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items));
}

function parseIntSafe(s: string): number | null {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function fwcAlbumToCatalogNumber(albumNumber: number): number | null {
  if (albumNumber < 0 || albumNumber > 19) return null;
  return albumNumber === 0 ? 1 : albumNumber + 1;
}

function resolvePastedStickerIds(args: {
  raw: string;
  catalog: CatalogStickerDTO[];
}): { stickerIds: string[]; matchedCount: number; unmatched: string[] } {
  const byId = new Map(args.catalog.map((s) => [s.id.toUpperCase(), s]));
  const byCatalogNumber = new Map(
    args.catalog.map((s) => [s.stickerNumber, s]),
  );
  const byTeamSlot = new Map<string, CatalogStickerDTO>();
  for (const s of args.catalog) {
    const up = s.teamCode.trim().toUpperCase();
    if (up === "FWC" || up === "MUSEUM") continue;
    const slot1 = s.positionInTeam + 1;
    byTeamSlot.set(`${up} ${slot1}`, s);
    byTeamSlot.set(`${up}${String(slot1).padStart(2, "0")}`, s);
  }

  const unmatched: string[] = [];
  const out: string[] = [];

  const lines = args.raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  const consume = (token: string): CatalogStickerDTO | null => {
    const t = normalizeToken(token);
    if (!t) return null;

    // id exacto (ARG05, PR-INT-23, etc.)
    const idHit = byId.get(t.toUpperCase());
    if (idHit) return idHit;

    // FWC 00 / FWC 7
    const mFwc = t.match(/^FWC\s*0?(\d{1,2})$/i);
    if (mFwc) {
      const album = parseIntSafe(mFwc[1] ?? "");
      if (album === null) return null;
      const cat = fwcAlbumToCatalogNumber(album);
      if (cat === null) return null;
      return byCatalogNumber.get(cat) ?? null;
    }

    // MUSEUM 1..10
    const mMuseum = t.match(/^MUSEUM\s*(\d{1,2})$/i);
    if (mMuseum) {
      const idx = parseIntSafe(mMuseum[1] ?? "");
      if (idx === null || idx < 1) return null;
      const museumCatalog = 981 + (idx - 1);
      return byCatalogNumber.get(museumCatalog) ?? null;
    }

    // TEAM 1..20 (ARG 5, ALG 03)
    const mTeamSlot = t.match(/^([A-Z]{3})\s*0?(\d{1,2})$/i);
    if (mTeamSlot) {
      const team = (mTeamSlot[1] ?? "").toUpperCase();
      const slot = parseIntSafe(mTeamSlot[2] ?? "");
      if (!team || slot === null) return null;
      return byTeamSlot.get(`${team} ${slot}`) ?? null;
    }

    // número de catálogo global: 23, #23
    const mNum = t.match(/^#?\s*(\d{1,4})$/);
    if (mNum) {
      const n = parseIntSafe(mNum[1] ?? "");
      if (n === null) return null;
      return byCatalogNumber.get(n) ?? null;
    }

    return null;
  };

  // Extrae tokens típicos dentro de cada línea (ej. "🇦🇷 ARG 5 · Jugador")
  const extractTokens = (line: string): string[] => {
    const t = line.toUpperCase();
    const toks: string[] = [];

    // IDs
    for (const m of t.matchAll(/PR-INT-\d{1,4}/g)) toks.push(m[0]);
    for (const m of t.matchAll(/[A-Z]{3}\d{2}/g)) toks.push(m[0]);

    // FWC / MUSEUM / TEAM SLOT
    for (const m of t.matchAll(/\bFWC\s*0?\d{1,2}\b/g)) toks.push(m[0]);
    for (const m of t.matchAll(/\bMUSEUM\s*\d{1,2}\b/g)) toks.push(m[0]);
    for (const m of t.matchAll(/\b[A-Z]{3}\s*0?\d{1,2}\b/g)) toks.push(m[0]);

    // números sueltos (#23, 23)
    for (const m of t.matchAll(/#\s*\d{1,4}/g)) toks.push(m[0]);
    return uniqueStrings(toks.map((x) => normalizeToken(x)));
  };

  for (const line of lines) {
    const candidates = extractTokens(line);
    if (candidates.length === 0) {
      // fallback: intentar consumir la línea completa
      const hit = consume(line);
      if (hit) out.push(hit.id);
      else unmatched.push(line);
      continue;
    }
    let matchedAny = false;
    for (const c of candidates) {
      const hit = consume(c);
      if (hit) {
        out.push(hit.id);
        matchedAny = true;
      }
    }
    if (!matchedAny) unmatched.push(line);
  }

  const ids = uniqueStrings(out);
  return { stickerIds: ids, matchedCount: ids.length, unmatched };
}

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

function applyAlbumStatusFilter(
  stickers: CatalogStickerDTO[],
  statusFilter: AlbumStatusFilter,
  userMap: UserStickerMapDTO | undefined,
  wantSet: Set<string>,
): CatalogStickerDTO[] {
  if (statusFilter === "all") return stickers;
  return stickers.filter((s) => {
    const entry = userMap?.[s.id];
    if (statusFilter === "missing") return !entry;
    if (statusFilter === "have") return entry?.status === "have";
    if (statusFilter === "duplicate") return entry?.status === "duplicate";
    return !entry && wantSet.has(s.id);
  });
}

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
  return applyAlbumStatusFilter(bySearch, statusFilter, userMap, wantSet);
}

function pickAlbumSearchTab(filtered: CatalogStickerDTO[]): string | null {
  for (const s of filtered) {
    if (
      s.teamCode === "FWC" &&
      s.stickerNumber >= FWC_INTRO_CATALOG_MIN &&
      s.stickerNumber <= FWC_INTRO_CATALOG_MAX
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

function initialAlbumTabForFilter(
  catalogStickers: CatalogStickerDTO[],
  blobs: ReadonlyMap<string, string>,
  filter: AlbumStatusFilter,
  userMap: UserStickerMapDTO,
  wantIds: string[],
): string {
  const filtered = applyAlbumFilters(
    catalogStickers,
    "",
    blobs,
    filter,
    userMap,
    new Set(wantIds),
  );
  return pickAlbumSearchTab(filtered) ?? "intro";
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
  teamSlice,
  renderCell,
}: {
  team: Team2026;
  stickers: CatalogStickerDTO[];
  teamSlice: TeamProgressSlice | undefined;
  renderCell: (s: CatalogStickerDTO) => ReactNode;
}) {
  const total = teamSlice?.total ?? stickers.length;
  const have = teamSlice?.have ?? 0;
  const dup = teamSlice?.duplicateSlots ?? 0;
  const dupExtra = teamSlice?.duplicateExtraCopies ?? 0;
  const missing = teamSlice?.missing ?? Math.max(0, total - have - dup);
  const collected = have + dup;
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;
  const greenW = total > 0 ? (have / total) * 100 : 0;
  const goldW = total > 0 ? (dup / total) * 100 : 0;

  const summaryLabel = `${team.name}: ${pct}% del álbum del equipo. ${formatIntegerEs(collected)} de ${formatIntegerEs(total)} con al menos una copia, ${formatIntegerEs(missing)} faltantes.`;

  return (
    <Collapsible
      defaultOpen={false}
      className="rounded-xl border border-zinc-200/90 bg-white text-zinc-900 shadow-sm transition-[box-shadow,background-color] duration-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-600/80 dark:bg-zinc-900/40 dark:text-zinc-50 dark:hover:border-zinc-500"
    >
      <CollapsibleTrigger
        className="min-h-12 w-full px-3 py-2.5 text-left sm:min-h-11 sm:px-4"
        aria-label={summaryLabel}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 sm:flex-nowrap sm:items-center sm:gap-3">
          <span className="flex max-w-[calc(100%-5.25rem)] min-w-0 flex-1 items-center gap-2 sm:max-w-[14rem]">
            <span className="text-lg leading-none select-none" aria-hidden>
              {fifaTeamFlagEmoji(team.code)}
            </span>
            <span className="line-clamp-2 min-w-0 leading-snug font-semibold tracking-tight break-words text-zinc-950 sm:line-clamp-1 sm:truncate dark:text-white">
              {team.name}
            </span>
          </span>

          <div className="order-last flex min-w-[6.5rem] flex-1 flex-col gap-1 sm:order-none sm:max-w-md sm:min-w-0">
            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-700/80"
              aria-hidden
            >
              <div className="absolute inset-0 flex">
                <div
                  className="h-full bg-emerald-500/90 transition-[width] duration-300 motion-reduce:transition-none dark:bg-emerald-400/90"
                  style={{ width: `${greenW}%` }}
                />
                <div
                  className="h-full bg-amber-400/95 transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${goldW}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] leading-tight text-zinc-600 sm:text-[11px] dark:text-zinc-400">
              <span className="font-medium text-zinc-800 tabular-nums dark:text-zinc-200">
                {formatIntegerEs(collected)} de {formatIntegerEs(total)}
              </span>
              {" · "}
              <span className="tabular-nums">
                {formatIntegerEs(missing)} faltan
              </span>
              {dup > 0 ? (
                <>
                  {" · "}
                  <span className="text-amber-800/90 tabular-nums dark:text-amber-300/90">
                    {formatIntegerEs(dup + dupExtra)} repetidas
                    {dupExtra > 0 ? (
                      <span className="text-amber-900/80 dark:text-amber-200/80">
                        {" "}
                        ({formatIntegerEs(dup)} casillas,{" "}
                        {formatIntegerEs(dupExtra)} de más)
                      </span>
                    ) : null}
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <span className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
            <span
              className="text-primary text-sm font-bold tracking-tight tabular-nums sm:text-base"
              title={`${pct}% de la selección`}
            >
              {pct}%
            </span>
            <span className="rounded-md border border-zinc-200/90 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-zinc-700 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-200">
              {team.code}
            </span>
          </span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-zinc-200/80 bg-gradient-to-b from-white to-zinc-100/90 p-2 sm:p-3 dark:border-zinc-600/60 dark:from-zinc-900/30 dark:to-zinc-950/80">
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

  const teamSearchBlobs = useMemo(() => getTeamSearchBlobMap(), []);

  const [tab, setTab] = useState(() =>
    initialAlbumTabForFilter(
      catalog,
      teamSearchBlobs,
      "missing",
      initialUserMap,
      initialExchangeWantIds,
    ),
  );
  const [bulkOpen, setBulkOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyRaw, setVerifyRaw] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<AlbumStatusFilter>("missing");
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

  const verifyResolved = useMemo(
    () => resolvePastedStickerIds({ raw: verifyRaw, catalog }),
    [verifyRaw, catalog],
  );

  const verifyMatchedCatalog = useMemo(() => {
    const byId = new Map(catalog.map((s) => [s.id, s]));
    return verifyResolved.stickerIds
      .map((id) => byId.get(id))
      .filter(Boolean) as CatalogStickerDTO[];
  }, [verifyResolved.stickerIds, catalog]);

  const verifyUseful = useMemo(
    () => verifyMatchedCatalog.filter((s) => !userMap?.[s.id]),
    [verifyMatchedCatalog, userMap],
  );

  const verifyAlreadyHave = useMemo(
    () => verifyMatchedCatalog.filter((s) => Boolean(userMap?.[s.id])),
    [verifyMatchedCatalog, userMap],
  );

  const copyVerifyUseful = () => {
    if (verifyUseful.length === 0) {
      toast.message("No hay figuritas de esa lista que te falten.");
      return;
    }
    const text = verifyUseful
      .slice()
      .sort((a, b) => a.stickerNumber - b.stickerNumber)
      .map((s) => `${catalogStickerDisplayLabel(s)} · ${catalogSlotLabel(s)}`)
      .join("\n");
    void navigator.clipboard.writeText(text).then(
      () => toast.success("Copiado"),
      () => toast.error("No se pudo copiar."),
    );
  };

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

  const setStatusFilterFromChip = useCallback(
    (value: AlbumStatusFilter) => {
      setStatusFilter(value);
      const filtered = applyAlbumFilters(
        catalog,
        searchQuery,
        teamSearchBlobs,
        value,
        userMap,
        wantSet,
      );
      const next = pickAlbumSearchTab(filtered);
      if (next) setTab(next);
    },
    [catalog, searchQuery, teamSearchBlobs, userMap, wantSet],
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
  const haveForExport = useMemo(
    () => listHaveStickers(catalog, userMap ?? {}),
    [catalog, userMap],
  );
  const duplicateForExport = useMemo(
    () => listDuplicateStickers(catalog, userMap ?? {}),
    [catalog, userMap],
  );

  const exportForStatusFilter = useMemo(() => {
    if (statusFilter === "missing") {
      return {
        rows: missingForExport,
        category: "faltantes" as const,
        label: "faltantes",
      };
    }
    if (statusFilter === "have") {
      return {
        rows: haveForExport,
        category: "tengo" as const,
        label: "tengo",
      };
    }
    if (statusFilter === "duplicate") {
      return {
        rows: duplicateForExport,
        category: "repetidas" as const,
        label: "repetidas",
      };
    }
    return null;
  }, [statusFilter, missingForExport, haveForExport, duplicateForExport]);

  const refreshAlbumQueries = async () => {
    await qc.invalidateQueries({ queryKey: key });
    await qc.invalidateQueries({ queryKey: ewKey });
  };

  const copyStickerWhatsApp = (
    rows: CatalogStickerDTO[],
    category: StickerExportCategory,
    emptyMessage: string,
    successMessage: string,
  ) => {
    if (rows.length === 0) {
      toast.message(emptyMessage);
      return;
    }
    const text = formatStickersWhatsApp(rows, category, {
      edition,
      userMap: userMap ?? {},
    });
    void navigator.clipboard.writeText(text).then(
      () => toast.success(successMessage),
      () => toast.error("No se pudo copiar. Revisa permisos del navegador."),
    );
  };

  const copyStickerNumbersWhatsApp = (
    rows: CatalogStickerDTO[],
    emptyMessage: string,
    successMessage: string,
  ) => {
    if (rows.length === 0) {
      toast.message(emptyMessage);
      return;
    }
    const text = formatStickerNumbersWhatsApp(rows);
    void navigator.clipboard.writeText(text).then(
      () => toast.success(successMessage),
      () => toast.error("No se pudo copiar."),
    );
  };

  const downloadStickerFile = (
    rows: CatalogStickerDTO[],
    category: StickerExportCategory,
    format: "txt" | "csv",
    emptyMessage: string,
  ) => {
    if (rows.length === 0) {
      toast.message(emptyMessage);
      return;
    }
    const isTxt = format === "txt";
    const body = isTxt
      ? formatStickersTxt(rows, category, { edition, userMap: userMap ?? {} })
      : formatStickersCsv(rows);
    const blob = new Blob([body], {
      type: isTxt ? "text/plain;charset=utf-8" : "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stickr-${category}-${edition}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isTxt ? "TXT listo para WhatsApp" : "CSV descargado");
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

  const introFwcAll = useMemo(
    () =>
      catalog
        .filter(
          (s) =>
            s.teamCode === "FWC" &&
            s.stickerNumber >= FWC_INTRO_CATALOG_MIN &&
            s.stickerNumber <= FWC_INTRO_CATALOG_MAX,
        )
        .sort((a, b) => a.stickerNumber - b.stickerNumber),
    [catalog],
  );

  const introFwc = useMemo(
    () => applyAlbumStatusFilter(introFwcAll, statusFilter, userMap, wantSet),
    [introFwcAll, statusFilter, userMap, wantSet],
  );

  const museumAll = useMemo(
    () =>
      catalog
        .filter((s) => s.teamCode === "MUSEUM")
        .sort((a, b) => a.stickerNumber - b.stickerNumber),
    [catalog],
  );

  const museum = useMemo(
    () => applyAlbumStatusFilter(museumAll, statusFilter, userMap, wantSet),
    [museumAll, statusFilter, userMap, wantSet],
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

  const slotsPct = Math.round(stats.percentCollected * 100);
  const bk = stats.blocks;

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
      {/* Misma cáscara blanca/zinc que login: WC global en root + tarjeta aquí. */}
      <div
        className="relative isolate w-full min-w-0 rounded-[1.75rem] border border-black/10 bg-white px-4 py-6 text-zinc-900 shadow-[0_25px_60px_-12px_rgb(0_0_0_/_0.35)] ring-1 ring-black/10 sm:rounded-[2rem] sm:px-8 sm:py-8 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10"
        data-page="album"
      >
        <div className="mb-6 space-y-2 border-b border-zinc-200/90 pb-6 sm:mb-8 sm:pb-7 dark:border-zinc-700/80">
          <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-zinc-500 uppercase sm:text-[0.7rem] sm:tracking-[0.28em] dark:text-zinc-400">
            Colección digital oficial
          </p>
          <p className="text-[0.7rem] font-bold tracking-[0.12em] text-[#d02670] uppercase sm:text-xs dark:text-[#ff6ba8]">
            FIFA World Cup 2026 · {edition}
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div aria-labelledby="album-heading">
              <h1
                id="album-heading"
                className="text-3xl font-black tracking-tight text-balance text-zinc-950 sm:text-4xl dark:text-white"
              >
                Mi álbum
              </h1>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                <span className="md:hidden">
                  Por defecto ves solo{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    faltantes
                  </span>
                  ; «Todas» muestra el álbum completo. Toca una casilla: falta →
                  tengo → repetida. En falta, la estrella prioriza para{" "}
                  <Link
                    className="text-primary font-medium underline-offset-2 hover:underline"
                    href="/discover"
                  >
                    Intercambio
                  </Link>
                  . Exportar (WhatsApp con banderas) va abajo.
                </span>
                <span className="hidden md:inline">
                  Por defecto el filtro es{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    Faltantes
                  </span>{" "}
                  (solo casillas vacías); elegí «Todas» para ver todo el álbum.
                  Pulsa para cambiar estado: falta → la tengo → repetida; si
                  está repetida, abre para la cantidad. La estrella en falta
                  prioriza para{" "}
                  <Link
                    className="text-primary font-medium underline-offset-2 hover:underline"
                    href="/discover"
                  >
                    Intercambio
                  </Link>
                  . Exportar para WhatsApp y marcar en lote están en el panel
                  sticky de abajo.
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
                  className={cn(
                    "border-zinc-200/90 bg-zinc-50 text-zinc-900 shadow-sm placeholder:text-zinc-500 dark:border-zinc-600/80 dark:bg-zinc-900/60 dark:text-zinc-50 dark:placeholder:text-zinc-500",
                    searchQuery.trim() ? "pr-10" : undefined,
                  )}
                />
                {searchQuery.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    aria-label="Limpiar búsqueda"
                    onClick={() => onSearchQueryChange("")}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
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
                        setStatusFilterFromChip(value as AlbumStatusFilter)
                      }
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              {exportForStatusFilter &&
              exportForStatusFilter.rows.length > 0 ? (
                <div
                  className="flex flex-col gap-2 rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 dark:border-amber-800/60 dark:bg-amber-950/40"
                  role="region"
                  aria-label={`Exportar ${exportForStatusFilter.label}`}
                >
                  <p className="text-xs font-medium text-amber-950 dark:text-amber-100">
                    Exportar{" "}
                    <span className="capitalize">
                      {exportForStatusFilter.label}
                    </span>{" "}
                    (
                    <span className="tabular-nums">
                      {formatIntegerEs(exportForStatusFilter.rows.length)}
                    </span>
                    )
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-9"
                      onClick={() =>
                        copyStickerWhatsApp(
                          exportForStatusFilter.rows,
                          exportForStatusFilter.category,
                          `No tienes ${exportForStatusFilter.label} en este álbum.`,
                          `${exportForStatusFilter.label} copiadas — pega en WhatsApp`,
                        )
                      }
                    >
                      Copiar para WhatsApp
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9"
                      onClick={() =>
                        downloadStickerFile(
                          exportForStatusFilter.rows,
                          exportForStatusFilter.category,
                          "txt",
                          `No tienes ${exportForStatusFilter.label} para exportar.`,
                        )
                      }
                    >
                      Descargar .txt
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9"
                      onClick={() =>
                        copyStickerNumbersWhatsApp(
                          exportForStatusFilter.rows,
                          `No tienes ${exportForStatusFilter.label} en este álbum.`,
                          "Números con bandera copiados",
                        )
                      }
                    >
                      Solo números
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative z-0 mb-4 space-y-3 rounded-xl border border-zinc-200/90 bg-zinc-50/95 p-4 text-zinc-900 shadow-sm md:sticky md:top-2 md:z-10 md:mb-0 md:backdrop-blur-sm dark:border-zinc-600/80 dark:bg-zinc-900/85 dark:text-zinc-50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-base leading-snug font-medium tracking-tight">
                  Te faltan{" "}
                  <span className="tabular-nums">
                    {formatIntegerEs(stats.missing)}
                  </span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    casillas
                  </span>{" "}
                  de{" "}
                  <span className="tabular-nums">
                    {formatIntegerEs(stats.total)}
                  </span>{" "}
                  del álbum (al menos una lámina por casilla).
                </p>

                <p className="text-sm leading-snug md:hidden">
                  <span className="font-semibold tabular-nums">
                    {slotsPct}%
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {" "}
                    ·{" "}
                    <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                      {formatIntegerEs(stats.slotsWithAtLeastOne)}
                    </span>
                    /{formatIntegerEs(stats.total)} casillas
                  </span>
                </p>

                <Collapsible className="md:hidden">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      Ver detalle del progreso
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1.5 pt-1 text-sm leading-snug">
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Cada casilla cuenta como mucho{" "}
                      <span className="font-medium">1</span> para el %, aunque
                      marques ×3 o ×4.
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Intro (FWC){" "}
                      <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                        {formatIntegerEs(bk.introFwc.slotsWithCopy)}
                      </span>
                      /{formatIntegerEs(bk.introFwc.catalogTotal)} · Equipos{" "}
                      <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                        {formatIntegerEs(bk.nationalTeams.slotsWithCopy)}
                      </span>
                      /{formatIntegerEs(bk.nationalTeams.catalogTotal)} · Museo{" "}
                      <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                        {formatIntegerEs(bk.museum.slotsWithCopy)}
                      </span>
                      /{formatIntegerEs(bk.museum.catalogTotal)}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Repetidas:{" "}
                      <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                        {formatIntegerEs(stats.duplicatePhysicalRepeats)}
                      </span>{" "}
                      láminas (
                      <span className="tabular-nums">
                        {formatIntegerEs(stats.duplicateExtraCopies)}
                      </span>{" "}
                      de más).
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      «Tengo» {formatIntegerEs(stats.have)} · «Repetida»{" "}
                      {formatIntegerEs(stats.duplicateStickers)} · Vacías{" "}
                      {formatIntegerEs(stats.missing)}
                    </p>
                  </CollapsibleContent>
                </Collapsible>

                <div className="hidden space-y-1.5 text-sm leading-snug md:block">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-semibold tabular-nums">
                      {slotsPct}%
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      del álbum:{" "}
                      <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                        {formatIntegerEs(stats.slotsWithAtLeastOne)}
                      </span>
                      /{formatIntegerEs(stats.total)} casillas con al menos una
                      lámina (cada casilla cuenta como mucho{" "}
                      <span className="font-medium">1</span> para el %, aunque
                      marques ×3 o ×4).
                    </span>
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Suma por bloque (debe coincidir con lo anterior): Intro
                    (FWC){" "}
                    <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                      {formatIntegerEs(bk.introFwc.slotsWithCopy)}
                    </span>
                    /{formatIntegerEs(bk.introFwc.catalogTotal)} · Equipos{" "}
                    <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                      {formatIntegerEs(bk.nationalTeams.slotsWithCopy)}
                    </span>
                    /{formatIntegerEs(bk.nationalTeams.catalogTotal)} · Museo{" "}
                    <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                      {formatIntegerEs(bk.museum.slotsWithCopy)}
                    </span>
                    /{formatIntegerEs(bk.museum.catalogTotal)}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Repetidas (solo información,{" "}
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      no suben el %
                    </span>
                    ):{" "}
                    <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                      {formatIntegerEs(stats.duplicatePhysicalRepeats)}
                    </span>{" "}
                    láminas en casillas «repetida» (
                    <span className="tabular-nums">
                      {formatIntegerEs(stats.duplicateExtraCopies)}
                    </span>{" "}
                    copias de más). Láminas físicas totales en tu poder:{" "}
                    <span className="text-zinc-800 tabular-nums dark:text-zinc-200">
                      {formatIntegerEs(stats.physicalSheetsOwned)}
                    </span>
                    .
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    «Tengo» {formatIntegerEs(stats.have)} · «Repetida»{" "}
                    {formatIntegerEs(stats.duplicateStickers)} casillas · Vacías{" "}
                    {formatIntegerEs(stats.missing)}
                  </p>
                </div>
                <AlbumProgressBar stats={stats} />
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 min-h-10 w-full px-4 text-sm sm:h-9 sm:min-h-9 sm:w-auto"
                  asChild
                >
                  <Link href="/discover">Ir a Intercambio</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 min-h-10 w-full px-4 text-sm sm:h-9 sm:min-h-9 sm:w-auto"
                  onClick={() => setVerifyOpen(true)}
                >
                  Verificar lista
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-10 min-h-10 w-full items-center justify-center rounded-[min(var(--radius-md),12px)] border border-zinc-200/90 bg-white px-3 text-[0.8rem] font-medium text-zinc-900 shadow-sm transition-all duration-200 outline-none hover:bg-zinc-100 sm:h-9 sm:min-h-9 sm:w-auto dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-50 dark:hover:bg-zinc-800">
                    Exportar y lote
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-[min(70vh,22rem)] min-w-56 overflow-y-auto"
                  >
                    <DropdownMenuLabel className="text-amber-800 dark:text-amber-200">
                      Repetidas ({formatIntegerEs(duplicateForExport.length)})
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() =>
                        copyStickerWhatsApp(
                          duplicateForExport,
                          "repetidas",
                          "No tienes repetidas en este álbum.",
                          "Repetidas copiadas — pega en WhatsApp",
                        )
                      }
                    >
                      Copiar repetidas para WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadStickerFile(
                          duplicateForExport,
                          "repetidas",
                          "txt",
                          "No tienes repetidas para exportar.",
                        )
                      }
                    >
                      Descargar .txt de repetidas
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        copyStickerNumbersWhatsApp(
                          duplicateForExport,
                          "No tienes repetidas en este álbum.",
                          "Números de repetidas copiados",
                        )
                      }
                    >
                      Copiar números de repetidas (compacto)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadStickerFile(
                          duplicateForExport,
                          "repetidas",
                          "csv",
                          "No tienes repetidas para exportar.",
                        )
                      }
                    >
                      Descargar CSV de repetidas
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>
                      Faltantes ({formatIntegerEs(missingForExport.length)})
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() =>
                        copyStickerWhatsApp(
                          missingForExport,
                          "faltantes",
                          "No tienes faltantes en este álbum.",
                          "Faltantes copiados — pega en WhatsApp",
                        )
                      }
                    >
                      Copiar faltantes para WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadStickerFile(
                          missingForExport,
                          "faltantes",
                          "txt",
                          "No tienes faltantes para exportar.",
                        )
                      }
                    >
                      Descargar .txt de faltantes
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        copyStickerNumbersWhatsApp(
                          missingForExport,
                          "No tienes faltantes en este álbum.",
                          "Números con bandera copiados",
                        )
                      }
                    >
                      Copiar números de faltantes (compacto)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadStickerFile(
                          missingForExport,
                          "faltantes",
                          "csv",
                          "No tienes faltantes para exportar.",
                        )
                      }
                    >
                      Descargar CSV de faltantes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>
                      Tengo ({formatIntegerEs(haveForExport.length)})
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() =>
                        copyStickerWhatsApp(
                          haveForExport,
                          "tengo",
                          "No tienes figuritas marcadas como tengo.",
                          "Tengo copiado — pega en WhatsApp",
                        )
                      }
                    >
                      Copiar tengo para WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadStickerFile(
                          haveForExport,
                          "tengo",
                          "txt",
                          "No tienes figuritas de tengo para exportar.",
                        )
                      }
                    >
                      Descargar .txt de tengo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        copyStickerNumbersWhatsApp(
                          haveForExport,
                          "No tienes figuritas marcadas como tengo.",
                          "Números con bandera copiados",
                        )
                      }
                    >
                      Copiar números de tengo (compacto)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadStickerFile(
                          haveForExport,
                          "tengo",
                          "csv",
                          "No tienes figuritas de tengo para exportar.",
                        )
                      }
                    >
                      Descargar CSV de tengo
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

          <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Verificar lista</DialogTitle>
                <DialogDescription>
                  Pegá una lista que te pasaron. Stickr detecta formatos como{" "}
                  <span className="font-mono">ARG 5</span>,{" "}
                  <span className="font-mono">FWC 00</span>,{" "}
                  <span className="font-mono">#23 ALG</span> o{" "}
                  <span className="font-mono">PR-INT-23</span>, y te dice cuáles
                  te sirven según tu álbum.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Textarea
                  rows={8}
                  value={verifyRaw}
                  onChange={(e) => setVerifyRaw(e.target.value)}
                  placeholder="Pegá acá la lista…"
                  className="font-mono text-sm"
                  autoComplete="off"
                />
                <p className="text-muted-foreground text-xs">
                  Coinciden en catálogo:{" "}
                  <span className="text-foreground font-medium">
                    {formatIntegerEs(verifyResolved.matchedCount)}
                  </span>
                  {verifyResolved.unmatched.length > 0 ? (
                    <>
                      {" "}
                      · Sin coincidencia:{" "}
                      {verifyResolved.unmatched.slice(0, 10).join(", ")}
                      {verifyResolved.unmatched.length > 10 ? "…" : ""}
                    </>
                  ) : null}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <p className="text-sm font-semibold">
                    Me sirven{" "}
                    <span className="text-muted-foreground font-normal tabular-nums">
                      ({formatIntegerEs(verifyUseful.length)})
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Te faltan en tu álbum.
                  </p>
                  <div className="mt-2 max-h-56 overflow-y-auto text-xs">
                    {verifyUseful.length === 0 ? (
                      <p className="text-muted-foreground italic">
                        Nada por ahora.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {verifyUseful
                          .slice()
                          .sort((a, b) => a.stickerNumber - b.stickerNumber)
                          .map((s) => (
                            <li key={s.id} className="tabular-nums">
                              {catalogStickerDisplayLabel(s)}{" "}
                              <span className="text-muted-foreground">·</span>{" "}
                              {catalogSlotLabel(s)}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <p className="text-sm font-semibold">
                    Ya las tengo{" "}
                    <span className="text-muted-foreground font-normal tabular-nums">
                      ({formatIntegerEs(verifyAlreadyHave.length)})
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Ya las marcaste (tengo o repetida).
                  </p>
                  <div className="mt-2 max-h-56 overflow-y-auto text-xs">
                    {verifyAlreadyHave.length === 0 ? (
                      <p className="text-muted-foreground italic">Ninguna.</p>
                    ) : (
                      <ul className="space-y-1">
                        {verifyAlreadyHave
                          .slice()
                          .sort((a, b) => a.stickerNumber - b.stickerNumber)
                          .map((s) => (
                            <li key={s.id} className="tabular-nums">
                              {catalogStickerDisplayLabel(s)}{" "}
                              <span className="text-muted-foreground">·</span>{" "}
                              {catalogSlotLabel(s)}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVerifyRaw("")}
                >
                  Limpiar
                </Button>
                <Button type="button" onClick={() => copyVerifyUseful()}>
                  Copiar “me sirven”
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {emptySearchHint ? (
            <div className="rounded-xl border border-dashed border-zinc-300/80 px-4 py-2 dark:border-zinc-600/80">
              {emptySearchHint}
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <div className="space-y-1.5 md:hidden">
              <Label
                htmlFor="album-section-select"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                Sección del álbum
              </Label>
              <Select value={tab} onValueChange={setTab}>
                <SelectTrigger
                  id="album-section-select"
                  className="h-11 w-full rounded-xl border border-zinc-200/90 bg-zinc-50 px-3 text-zinc-900 shadow-sm dark:border-zinc-600/80 dark:bg-zinc-900/60 dark:text-zinc-50"
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
              <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                En pantalla grande también puedes usar las pestañas
                horizontales.
              </p>
            </div>

            <div
              className="hidden max-w-full overflow-x-auto rounded-2xl border border-zinc-200/90 bg-zinc-100/90 p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:thin] md:block md:scroll-px-2 dark:border-zinc-600/70 dark:bg-zinc-900/50 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-0 md:[&::-webkit-scrollbar]:hidden"
              role="region"
              aria-label="Secciones del álbum (vista ancha)"
            >
              <TabsList className="flex h-auto min-w-max flex-nowrap gap-1 rounded-xl bg-zinc-200/60 p-1 text-zinc-700 ring-1 ring-zinc-300/50 sm:gap-1.5 dark:bg-zinc-800/60 dark:text-zinc-300 dark:ring-zinc-600/40">
                <TabsTrigger
                  value="intro"
                  title="Intro Panini (FWC): FWC 00 y FWC 1–19 (n.º de catálogo digital 1–20)"
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
              {emptySearchHint ? null : introFwcAll.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No hay figuritas de intro FWC en este catálogo.
                </p>
              ) : introFwc.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Ninguna figurita de intro coincide con el filtro de estado
                  activo. Probá con «Todas» u otro filtro.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Bloque inicial Panini (FWC): en el álbum van{" "}
                    <span className="text-foreground font-medium">FWC 00</span>{" "}
                    más{" "}
                    <span className="text-foreground font-medium">
                      FWC 1 a FWC 19
                    </span>{" "}
                    (20 figuritas); aquí el n.º de catálogo digital sigue siendo
                    1–20.
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
                      {g.teams
                        .filter(
                          (team) =>
                            (stickerByTeam.get(team.code) ?? []).length > 0,
                        )
                        .map((team) => (
                          <TeamCollapsible
                            key={team.code}
                            team={team}
                            stickers={stickerByTeam.get(team.code) ?? []}
                            teamSlice={stats.byTeam[team.code]}
                            renderCell={renderSticker}
                          />
                        ))}
                    </div>
                  </>
                )}
              </TabsContent>
            ))}

            <TabsContent value="museum">
              {emptySearchHint ? null : museumAll.length === 0 ? (
                <div className="text-muted-foreground space-y-2 py-8 text-center text-sm leading-relaxed">
                  <p>
                    Este catálogo aún no incluye el bloque Museo (10 figuritas).
                  </p>
                  <p>
                    Ejecutá{" "}
                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                      pnpm seed:catalog
                    </code>{" "}
                    contra tu base para cargar n.º 981–990 (MUSEUM), o aplicá en
                    Postgres el SQL{" "}
                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                      lib/db/migrations/0018_sticker_catalog_museum.sql
                    </code>
                    .
                  </p>
                </div>
              ) : museum.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Ninguna figurita de Museo coincide con el filtro de estado
                  activo. Probá con «Todas» u otro filtro.
                </p>
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
      </div>
      <AlbumBulkDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        catalogEdition={catalog}
        onCommitted={refreshAlbumQueries}
      />
    </>
  );
}
