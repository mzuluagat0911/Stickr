import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ConversationMarketOffers } from "@/components/features/conversation-market-offers";
import {
  conversationMarketLabel,
  type MarketIntentEmbed,
} from "@/lib/messages/conversation-label";
import { defaultMarketCurrency } from "@/lib/marketplace/currency";
import type { MarketOfferRow } from "@/lib/marketplace/offer-types";
import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";
import { conversationIdSchema } from "@/lib/validations/messages";

import { MessageComposer } from "@/components/features/message-composer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ConvDetail = {
  id: string;
  user_a: string;
  user_b: string;
  market_intention_id: string | null;
  market_intentions:
    | {
        sticker_number?: number | null;
        kind?: string | null;
        currency?: string | null;
      }
    | {
        sticker_number?: number | null;
        kind?: string | null;
        currency?: string | null;
      }[]
    | null;
};

type MsgRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function normalizeIntentEmbed(
  raw: ConvDetail["market_intentions"],
): MarketIntentEmbed {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId: rawId } = await params;
  const parsed = conversationIdSchema.safeParse(rawId);
  if (!parsed.success) {
    notFound();
  }
  const conversationId = parsed.data;

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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("country_code")
    .eq("id", user.id)
    .maybeSingle();

  const defaultCurrency = defaultMarketCurrency(profile?.country_code ?? null);

  const { data: conv, error: cErr } = await supabase
    .from("conversations")
    .select(
      "id,user_a,user_b,market_intention_id,market_intentions(sticker_number,kind,currency)",
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (cErr || !conv) {
    notFound();
  }

  const row = conv as ConvDetail;
  if (row.user_a !== user.id && row.user_b !== user.id) {
    notFound();
  }

  const { data: msgs, error: mErr } = await supabase
    .from("messages")
    .select("id,sender_id,content,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (mErr) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm" role="alert">
          {mErr.message}
        </p>
        <Button variant="outline" asChild>
          <Link href="/messages">Volver</Link>
        </Button>
      </div>
    );
  }

  const messages = (msgs ?? []) as MsgRow[];
  const title =
    conversationMarketLabel(normalizeIntentEmbed(row.market_intentions)) ??
    "Conversación";
  const peer = row.user_a === user.id ? row.user_b : row.user_a;

  let initialOffers: MarketOfferRow[] = [];
  if (row.market_intention_id) {
    const { data: offRows, error: offErr } = await supabase
      .from("market_offers")
      .select(
        "id,from_user_id,to_user_id,price_cents,currency,status,created_at,parent_offer_id,responded_at",
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!offErr && Array.isArray(offRows)) {
      initialOffers = offRows as MarketOfferRow[];
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2" asChild>
            <Link href="/messages">← Mensajes</Link>
          </Button>
          <h1 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
            {title}
          </h1>
          <p className="text-muted-foreground text-xs">
            Con coleccionista ·{" "}
            <span className="font-mono">{peer.slice(0, 8)}…</span>
          </p>
        </div>
      </div>

      {row.market_intention_id ? (
        <ConversationMarketOffers
          conversationId={conversationId}
          currentUserId={user.id}
          initialOffers={initialOffers}
          defaultCurrency={defaultCurrency}
        />
      ) : null}

      <div className="bg-muted/25 border-border/50 flex max-h-[min(55vh,28rem)] flex-col gap-3 overflow-y-auto rounded-2xl border p-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-center text-sm">
            Aún no hay mensajes. Saluda y coordina con respeto.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div
                key={m.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground ring-border/60 ring-1",
                  )}
                >
                  <p className="break-words whitespace-pre-wrap">{m.content}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px] tabular-nums opacity-80",
                      mine ? "text-right" : "text-left",
                    )}
                  >
                    {new Date(m.created_at).toLocaleString("es-CO", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageComposer conversationId={conversationId} />
    </div>
  );
}
