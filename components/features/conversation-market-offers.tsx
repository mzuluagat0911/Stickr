"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  proposeMarketOfferAction,
  respondToMarketOfferAction,
} from "@/app/actions/market-offers";
import { formatMinorCurrency } from "@/lib/format-currency";
import {
  MARKET_CURRENCY_CODES,
  MARKET_CURRENCY_UI,
  type MarketCurrencyCode,
} from "@/lib/marketplace/currency";
import type { MarketOfferRow } from "@/lib/marketplace/offer-types";

import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

function offerBadgeVariant(
  status: string,
): "default" | "destructive" | "outline" | "secondary" {
  if (status === "accepted") return "default";
  if (status === "rejected") return "destructive";
  if (status === "superseded") return "outline";
  return "secondary";
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "accepted":
      return "Aceptada";
    case "rejected":
      return "Rechazada";
    case "superseded":
      return "Reemplazada";
    default:
      return status;
  }
}

export function ConversationMarketOffers({
  conversationId,
  currentUserId,
  initialOffers,
  defaultCurrency,
}: {
  conversationId: string;
  currentUserId: string;
  initialOffers: MarketOfferRow[];
  defaultCurrency: MarketCurrencyCode;
}) {
  const router = useRouter();
  const [currency, setCurrency] = useState<MarketCurrencyCode>(defaultCurrency);
  const [pending, startTransition] = useTransition();

  const pendingForMe = initialOffers.find(
    (o) => o.status === "pending" && o.to_user_id === currentUserId,
  );

  return (
    <section className="border-border/60 bg-muted/10 space-y-4 rounded-2xl border p-4">
      <div className="space-y-1">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Ofertas de precio
        </h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Propón un monto; la otra persona puede aceptar, rechazar o
          contraofertar con una nueva propuesta (la pendiente anterior queda
          reemplazada).
        </p>
      </div>

      {initialOffers.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aún no hay ofertas registradas en este hilo.
        </p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {initialOffers.map((o) => {
            const mine = o.from_user_id === currentUserId;
            const amount = Number(o.price_cents);
            return (
              <li
                key={o.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm",
                  mine ? "border-primary/25 bg-primary/5" : "bg-card/80",
                )}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium tabular-nums">
                    {formatMinorCurrency(
                      Number.isFinite(amount) ? amount : 0,
                      o.currency,
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {mine ? "Tu propuesta" : "Su propuesta"} ·{" "}
                    {new Date(o.created_at).toLocaleString("es-CO", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <Badge
                  variant={offerBadgeVariant(o.status)}
                  className="shrink-0 rounded-full text-[10px]"
                >
                  {statusLabel(o.status)}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}

      {pendingForMe ? (
        <div className="border-border/50 bg-background/60 flex flex-wrap gap-2 rounded-xl border p-3">
          <p className="text-muted-foreground w-full text-xs">
            Tienes una oferta pendiente por{" "}
            <span className="text-foreground font-medium tabular-nums">
              {formatMinorCurrency(
                Number(pendingForMe.price_cents),
                pendingForMe.currency,
              )}
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await respondToMarketOfferAction(
                  pendingForMe.id,
                  "accepted",
                );
                if (res.ok) {
                  toast.success("Oferta aceptada");
                  router.refresh();
                } else {
                  toast.error(res.message);
                }
              });
            }}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              "Aceptar"
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await respondToMarketOfferAction(
                  pendingForMe.id,
                  "rejected",
                );
                if (res.ok) {
                  toast.success("Oferta rechazada");
                  router.refresh();
                } else {
                  toast.error(res.message);
                }
              });
            }}
          >
            Rechazar
          </Button>
        </div>
      ) : null}

      <form
        className="border-border/50 bg-background/50 space-y-3 rounded-xl border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("currency", currency);
          startTransition(async () => {
            const res = await proposeMarketOfferAction(conversationId, fd);
            if (res.ok) {
              toast.success("Oferta enviada");
              (e.target as HTMLFormElement).reset();
              router.refresh();
            } else {
              toast.error(res.message);
            }
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="offer-price">Tu propuesta (importe)</Label>
            <Input
              id="offer-price"
              name="priceMajor"
              required
              inputMode="decimal"
              placeholder="Ej. 15.000 o 2500"
              disabled={pending}
              className="rounded-xl tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-currency">Moneda</Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as MarketCurrencyCode)}
              disabled={pending}
            >
              <SelectTrigger id="offer-currency" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKET_CURRENCY_CODES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {MARKET_CURRENCY_UI[code].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className="rounded-xl"
        >
          {pending ? (
            <>
              <Loader2
                className="mr-2 size-4 shrink-0 animate-spin"
                aria-hidden
              />
              Enviando…
            </>
          ) : (
            "Enviar oferta"
          )}
        </Button>
      </form>
    </section>
  );
}
