import { createClient } from "@/lib/supabase/server";

import type { MarketFeedIntent } from "@/lib/marketplace/types";

export async function getMarketFeed(): Promise<
  { ok: true; intents: MarketFeedIntent[] } | { ok: false; message: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { ok: false, message: "Sesión no válida." };
    }

    const { data: rows, error } = await supabase
      .from("market_intentions")
      .select(
        "id,sticker_number,sticker_id,kind,shipping_scope,price_cents,currency,album_edition,created_at,user_id",
      )
      .eq("status", "active")
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

    type Row = {
      id: string;
      sticker_number: number;
      sticker_id: string;
      kind: string;
      shipping_scope: string;
      price_cents: number;
      currency: string;
      album_edition: string;
      created_at: string | null;
      user_id: string;
    };

    const list = (rows ?? []) as Row[];
    if (list.length === 0) {
      return { ok: true, intents: [] };
    }

    const userIds = [...new Set(list.map((r) => r.user_id))];
    const { data: names, error: nErr } = await supabase
      .from("user_profiles")
      .select("id,username")
      .in("id", userIds);

    const usernameById = new Map<string, string | null>();
    if (!nErr && names) {
      for (const u of names as {
        id: string;
        username: string | null;
      }[]) {
        usernameById.set(u.id, u.username);
      }
    }

    const intents: MarketFeedIntent[] = [];
    for (const r of list) {
      const uname = usernameById.get(r.user_id) ?? null;
      const kind = r.kind === "sell" ? "sell" : "buy";
      const shippingScope =
        r.shipping_scope === "national" ? "national" : "local_only";
      intents.push({
        id: r.id,
        stickerNumber: Number(r.sticker_number),
        stickerId: r.sticker_id,
        kind,
        shippingScope,
        priceCents: Number(r.price_cents),
        currency: typeof r.currency === "string" ? r.currency : "ARS",
        albumEdition: r.album_edition,
        createdAt: r.created_at,
        userId: r.user_id,
        username: uname,
      });
    }

    return { ok: true, intents };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "No pudimos cargar el marketplace en este momento.";
    return { ok: false, message };
  }
}
