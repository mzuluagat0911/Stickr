import type { SupabaseClient } from "@supabase/supabase-js";

import { isMarketCurrency } from "@/lib/marketplace/currency";
import { ACTIVE_MARKET_INTENTION_STATUS } from "@/lib/marketplace/phase3-states";
import type { MarketFeedIntent } from "@/lib/marketplace/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function normalizeRow(row: unknown): MarketFeedIntent | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;

  if (!isUuid(r.id) || !isUuid(r.user_id)) return null;

  const stickerId = typeof r.sticker_id === "string" ? r.sticker_id.trim() : "";
  if (!stickerId) return null;

  const stickerNumber = Math.trunc(Number(r.sticker_number));
  if (!Number.isFinite(stickerNumber)) return null;

  const priceCents = Math.trunc(Number(r.price_cents));
  if (!Number.isFinite(priceCents)) return null;

  const rawCurrency =
    typeof r.currency === "string" ? r.currency.trim().toUpperCase() : "";
  const currency = isMarketCurrency(rawCurrency) ? rawCurrency : "ARS";

  const edition =
    typeof r.album_edition === "string" && r.album_edition.trim().length > 0
      ? r.album_edition.trim()
      : "PR-International";

  const kind = r.kind === "sell" ? "sell" : "buy";
  const shippingScope =
    r.shipping_scope === "national" ? "national" : "local_only";

  const createdAt =
    typeof r.created_at === "string" && r.created_at.length > 0
      ? r.created_at
      : null;

  return {
    id: r.id,
    stickerNumber,
    stickerId,
    kind,
    shippingScope,
    priceCents,
    currency,
    albumEdition: edition,
    createdAt,
    userId: r.user_id,
    username: null,
  };
}

export async function getMarketFeed(
  supabase: SupabaseClient,
): Promise<
  { ok: true; intents: MarketFeedIntent[] } | { ok: false; message: string }
> {
  try {
    const { data: rows, error } = await supabase
      .from("market_intentions")
      .select(
        "id,sticker_number,sticker_id,kind,shipping_scope,price_cents,currency,album_edition,created_at,user_id",
      )
      .eq("status", ACTIVE_MARKET_INTENTION_STATUS)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (
        error.message.includes("market_intentions") ||
        error.message.includes("schema cache") ||
        error.code === "42P01"
      ) {
        return {
          ok: false,
          message: `${error.message} Si falta la tabla, ejecuta la migración 0006_market_intentions en Supabase.`,
        };
      }
      return { ok: false, message: error.message };
    }

    const rawList = Array.isArray(rows) ? rows : [];
    const normalized: MarketFeedIntent[] = [];
    for (const row of rawList) {
      const intent = normalizeRow(row);
      if (intent) normalized.push(intent);
    }

    if (normalized.length === 0) {
      return { ok: true, intents: [] };
    }

    const userIds = [
      ...new Set(
        normalized
          .map((i) => i.userId)
          .filter((id): id is string => typeof id === "string" && isUuid(id)),
      ),
    ];

    const usernameById = new Map<string, string | null>();

    if (userIds.length > 0) {
      const { data: rpcRows, error: rpcErr } = await supabase.rpc(
        "get_user_display_names_for_marketplace",
        { p_user_ids: userIds },
      );

      const applyRows = (rows: unknown) => {
        if (!Array.isArray(rows)) return;
        for (const u of rows) {
          if (!u || typeof u !== "object") continue;
          const rec = u as { id?: unknown; username?: unknown };
          if (!isUuid(rec.id)) continue;
          if (typeof rec.username === "string") {
            const t = rec.username.trim();
            usernameById.set(rec.id, t.length > 0 ? t : null);
          } else {
            usernameById.set(rec.id, null);
          }
        }
      };

      if (!rpcErr) {
        applyRows(rpcRows);
      } else {
        const { data: names, error: nErr } = await supabase
          .from("user_profiles")
          .select("id,username")
          .in("id", userIds);

        if (!nErr && Array.isArray(names)) {
          applyRows(names);
        }
      }
    }

    const intents: MarketFeedIntent[] = normalized.map((intent) => ({
      ...intent,
      username: usernameById.get(intent.userId) ?? null,
    }));

    return { ok: true, intents };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "No pudimos cargar el marketplace en este momento.";
    return { ok: false, message };
  }
}
