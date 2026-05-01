"use client";

import {
  type ReactNode,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGridIcon } from "lucide-react";
import { toast } from "sonner";

import {
  getUserStickersMapAction,
  markStickerDuplicateAction,
  markStickerHaveAction,
  unmarkStickerAction,
} from "@/app/actions/album";
import { computeAlbumProgress } from "@/lib/album/progress";
import { albumStickersQueryKey } from "@/lib/album/query-keys";
import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";
import { AlbumProgressBar } from "@/components/album/album-progress-bar";
import { StickerCell } from "@/components/album/sticker-cell";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        <span className="font-medium">{team.name}</span>
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
}: AlbumGridProps) {
  const qc = useQueryClient();
  const key = albumStickersQueryKey(edition, userId);

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
  });

  const stats = useMemo(
    () => computeAlbumProgress(catalog, userMap ?? {}),
    [catalog, userMap],
  );

  const [tab, setTab] = useState("tournament");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const tournament = useMemo(
    () =>
      catalog.filter(
        (s) =>
          s.teamCode === "FWC" && s.stickerNumber >= 1 && s.stickerNumber <= 15,
      ),
    [catalog],
  );

  const specials = useMemo(
    () =>
      catalog.filter(
        (s) =>
          s.teamCode === "FWC" &&
          s.stickerNumber >= 16 &&
          s.stickerNumber <= 83,
      ),
    [catalog],
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
    for (const s of catalog) {
      if (s.teamCode === "FWC") continue;
      if (!m.has(s.teamCode)) m.set(s.teamCode, []);
      m.get(s.teamCode)!.push(s);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => a.positionInTeam - b.positionInTeam);
    }
    return m;
  }, [catalog]);

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
    return (
      <StickerCell
        key={s.id}
        sticker={s}
        entry={userMap?.[s.id]}
        tabIndex={validFocusId === s.id ? 0 : -1}
        onFocus={() => setFocusedId(s.id)}
        registerCell={(el) => registerRef(s.id, el)}
        {...h}
      />
    );
  };

  const collected = stats.have + stats.duplicateStickers;
  const pctLabel = `${Math.round(stats.percentCollected * 100)}%`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mi álbum</h1>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm leading-relaxed">
          Click para avanzar: falta → la tengo → repetida. En repetidas abrís el
          panel para ajustar cantidad. Teclado: Tab entre casillas, Space cicla,
          Shift+Space al revés; en repetida, teclas 1–9 fijan ×2–×10.
        </p>
      </div>

      <div className="bg-background/80 supports-backdrop-filter:bg-background/70 sticky top-0 z-20 space-y-3 rounded-xl border p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <span className="font-semibold">{pctLabel}</span>
              <span className="text-muted-foreground">
                {stats.have} tengo · {stats.duplicateStickers} repetidas ·{" "}
                {stats.missing} faltan · {stats.total} total
              </span>
            </div>
            <AlbumProgressBar stats={stats} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled
            title="Próximamente"
          >
            Compartir mi progreso
          </Button>
        </div>
      </div>

      {collected === 0 ? (
        <EmptyState
          icon={LayoutGridIcon}
          title="Tu álbum está vacío"
          description="Marcá tu primera figurita haciendo click en la cuadrícula."
        />
      ) : null}

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
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {tournament.map((s) => renderSticker(s))}
          </div>
        </TabsContent>

        <TabsContent value="specials">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {specials.map((s) => renderSticker(s))}
          </div>
        </TabsContent>

        {CONF_TAB_ORDER.map((c) => (
          <TabsContent key={c} value={`conf-${c}`} className="space-y-2">
            {(teamsByConf.get(c) ?? []).map((team) => (
              <TeamCollapsible
                key={team.code}
                team={team}
                stickers={stickerByTeam.get(team.code) ?? []}
                renderCell={renderSticker}
              />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
