import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  ConversationDealClosure,
  type MyMarketReview,
  type MarketDealRow,
} from "@/components/features/conversation-deal-closure";
import { ConversationExchangeGuide } from "@/components/features/conversation-exchange-guide";
import { ConversationExchangeJourneyBar } from "@/components/features/conversation-exchange-journey-bar";
import { ConversationMarketOffers } from "@/components/features/conversation-market-offers";
import { ConversationPeerContactPanel } from "@/components/features/conversation-peer-contact";
import {
  conversationMarketLabel,
  type MarketIntentEmbed,
} from "@/lib/messages/conversation-label";
import { defaultMarketCurrency } from "@/lib/marketplace/currency";
import type { MarketOfferRow } from "@/lib/marketplace/offer-types";
import { parseConversationPeerContact } from "@/lib/profile/contact-links";
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
    .select("country_code, display_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const selfDisplayName =
    (typeof profile?.display_name === "string"
      ? profile.display_name.trim()
      : "") ||
    (typeof profile?.username === "string" ? profile.username.trim() : "") ||
    "Yo";

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

  if (!row.market_intention_id) {
    const { error: markReadErr } = await supabase.rpc(
      "mark_trade_proposal_notifications_read",
      { p_conversation_id: conversationId },
    );
    if (markReadErr) {
      const missingFn =
        markReadErr.code === "42883" ||
        markReadErr.message.includes("mark_trade_proposal_notifications_read");
      if (missingFn) {
        console.warn(
          "[ConversationPage] Falta migración 0022_notifications_trade_proposal.sql:",
          markReadErr.message,
        );
      } else {
        console.warn(
          "[ConversationPage] mark_trade_proposal_notifications_read:",
          markReadErr.message,
        );
      }
    }
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
  const title = row.market_intention_id
    ? (conversationMarketLabel(normalizeIntentEmbed(row.market_intentions)) ??
      "Compra/venta")
    : "Intercambio";
  type PeerPublicRow = { username: string | null; city: string | null };
  let peerUsername = "";
  let peerCity: string | null = null;
  const { data: peerRows, error: peerRpcErr } = await supabase.rpc(
    "get_conversation_peer_public_profile",
    { p_conversation_id: conversationId },
  );
  if (!peerRpcErr && Array.isArray(peerRows) && peerRows.length > 0) {
    const pr = peerRows[0] as PeerPublicRow;
    peerUsername = typeof pr.username === "string" ? pr.username.trim() : "";
    peerCity =
      typeof pr.city === "string" && pr.city.trim() !== ""
        ? pr.city.trim()
        : null;
  }
  const peerLabel =
    peerUsername !== "" ? `@${peerUsername}` : "Otro coleccionista";

  const { data: peerContactRpc, error: peerContactErr } = await supabase.rpc(
    "get_conversation_peer_contact",
    { p_conversation_id: conversationId },
  );
  const peerContact = peerContactErr
    ? null
    : parseConversationPeerContact(peerContactRpc);

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

  let dealRow: MarketDealRow | null = null;
  let myReview: MyMarketReview = null;
  if (row.market_intention_id) {
    const { data: dealData, error: dealErr } = await supabase
      .from("market_deals")
      .select("id,status,user_a_completed_at,user_b_completed_at,completed_at")
      .eq("conversation_id", conversationId)
      .maybeSingle();
    if (!dealErr && dealData?.id) {
      dealRow = dealData as MarketDealRow;
      const { data: revData } = await supabase
        .from("reviews")
        .select("id,rating,review_text")
        .eq("market_deal_id", dealRow.id)
        .eq("reviewer_id", user.id)
        .maybeSingle();
      if (revData?.id) {
        myReview = revData as MyMarketReview;
      }
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
            <span className="text-foreground font-medium">{peerLabel}</span>
            {peerCity ? (
              <>
                {" "}
                · <span>{peerCity}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {!row.market_intention_id ? (
        <ConversationExchangeGuide
          peerUsername={peerUsername || "coleccionista"}
        />
      ) : null}

      <ConversationPeerContactPanel
        peerLabel={peerLabel}
        contact={peerContact}
      />

      {!row.market_intention_id ? (
        <ConversationExchangeJourneyBar
          conversationId={conversationId}
          peerUsername={peerUsername}
          selfDisplayName={selfDisplayName}
          peerWhatsappE164={peerContact?.whatsapp ?? null}
        />
      ) : null}

      {row.market_intention_id ? (
        <ConversationMarketOffers
          conversationId={conversationId}
          currentUserId={user.id}
          initialOffers={initialOffers}
          defaultCurrency={defaultCurrency}
        />
      ) : null}

      {row.market_intention_id ? (
        <ConversationDealClosure
          conversationId={conversationId}
          currentUserId={user.id}
          userA={row.user_a}
          userB={row.user_b}
          deal={dealRow}
          myReview={myReview}
        />
      ) : null}

      <div className="bg-card/75 border-border/65 ring-border/30 dark:bg-card/55 flex max-h-[min(55vh,28rem)] flex-col gap-3 overflow-y-auto rounded-2xl border p-4 shadow-inner ring-1 backdrop-blur-md">
        {messages.length === 0 ? (
          row.market_intention_id ? (
            <p className="text-muted-foreground text-center text-sm">
              Aún no hay mensajes. Saluda y coordina con respeto.
            </p>
          ) : (
            <div className="text-muted-foreground mx-auto max-w-sm space-y-3 px-1 text-sm">
              <p className="text-foreground text-center font-medium">
                Aún no hay mensajes
              </p>
              <p className="text-center text-xs leading-relaxed">
                Un primer mensaje claro evita malentendidos sobre números de
                figurita y cantidades.
              </p>
              <ul className="marker:text-primary list-inside list-disc space-y-1.5 text-xs leading-relaxed">
                <li>
                  Saludá y decí qué buscás u ofrecés (con código si podés).
                </li>
                <li>
                  Confirmá edición del álbum si no está implícito en el código.
                </li>
                <li>
                  Acordá lugar seguro o canal externo solo si ambos quieren.
                </li>
              </ul>
            </div>
          )
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

      <MessageComposer
        conversationId={conversationId}
        placeholder={
          row.market_intention_id
            ? undefined
            : "Ej.: ¿Tenés la PR-INT-142 repetida? Yo te puedo dar…"
        }
      />
    </div>
  );
}
