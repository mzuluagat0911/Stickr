import Link from "next/link";
import { redirect } from "next/navigation";

import {
  conversationMarketLabel,
  type MarketIntentEmbed,
} from "@/lib/messages/conversation-label";
import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type ConvRow = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string | null;
  created_at: string | null;
  market_intention_id: string | null;
  market_intentions:
    | {
        sticker_number?: number | null;
        kind?: string | null;
        currency?: string | null;
        status?: string | null;
      }
    | {
        sticker_number?: number | null;
        kind?: string | null;
        currency?: string | null;
        status?: string | null;
      }[]
    | null;
};

function normalizeIntentEmbed(
  raw: ConvRow["market_intentions"],
): MarketIntentEmbed {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

export default async function MessagesPage() {
  if (!hasPublicSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: rows, error } = await supabase
    .from("conversations")
    .select(
      "id,user_a,user_b,last_message_at,created_at,market_intention_id,market_intentions(sticker_number,kind,currency,status)",
    )
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Mensajes
        </h1>
        <p className="text-destructive text-sm" role="alert">
          {error.message}
        </p>
      </div>
    );
  }

  const list = (rows ?? []) as ConvRow[];

  const proposalConvIds = new Set<string>();
  const { data: tradeNotifs, error: tradeNotifErr } = await supabase
    .from("notifications")
    .select("payload")
    .eq("user_id", user.id)
    .eq("type", "trade_proposed")
    .is("read_at", null);

  if (!tradeNotifErr && Array.isArray(tradeNotifs)) {
    for (const row of tradeNotifs) {
      const payload = row.payload as { conversation_id?: unknown } | null;
      const cid = payload?.conversation_id;
      if (typeof cid === "string" && cid.length > 0) {
        proposalConvIds.add(cid);
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Mensajes
        </h1>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm leading-relaxed">
          Hilos de compra/venta e intercambio. Una propuesta desde Descubrir
          aparece como solicitud hasta que abras el chat.
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="Sin conversaciones todavía"
          description="Desde Compra/venta, usa «Contactar» en una publicación de otra persona para abrir un hilo aquí."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((c) => {
            const peer = c.user_a === user.id ? c.user_b : c.user_a;
            const label = c.market_intention_id
              ? (conversationMarketLabel(
                  normalizeIntentEmbed(c.market_intentions),
                ) ?? "Compra/venta")
              : "Intercambio";
            const when = c.last_message_at ?? c.created_at;
            const whenLabel = when
              ? new Date(when).toLocaleString("es-CO", {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "";
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`}>
                  <Card className="border-border/65 bg-card/40 hover:bg-muted/35 rounded-2xl shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm transition-colors dark:ring-white/[0.06]">
                    <CardContent className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-foreground truncate font-medium tracking-tight">
                            {label}
                          </p>
                          {!c.market_intention_id &&
                          proposalConvIds.has(c.id) ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-semibold tracking-wide uppercase"
                            >
                              Solicitud
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground text-xs leading-snug">
                          {c.market_intention_id ? (
                            <>
                              Con coleccionista ·{" "}
                              <span className="font-mono text-[11px] tabular-nums">
                                {peer.slice(0, 8)}…
                              </span>
                            </>
                          ) : (
                            <>Coordinación directa entre coleccionistas</>
                          )}
                        </p>
                      </div>
                      {whenLabel ? (
                        <p className="text-muted-foreground shrink-0 text-xs tabular-nums sm:text-right">
                          {whenLabel}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
