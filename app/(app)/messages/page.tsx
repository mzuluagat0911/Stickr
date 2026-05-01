import Link from "next/link";
import { redirect } from "next/navigation";

import {
  conversationMarketLabel,
  type MarketIntentEmbed,
} from "@/lib/messages/conversation-label";
import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Mensajes
        </h1>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm leading-relaxed">
          Hilos para coordinar compra/venta u otros acuerdos con otros
          coleccionistas.
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
            const label =
              conversationMarketLabel(
                normalizeIntentEmbed(c.market_intentions),
              ) ?? "Conversación";
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
                  <Card className="border-border/60 hover:bg-muted/30 transition-colors">
                    <CardContent className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-foreground truncate font-medium tracking-tight">
                          {label}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Con coleccionista ·{" "}
                          <span className="font-mono text-[11px]">
                            {peer.slice(0, 8)}…
                          </span>
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
