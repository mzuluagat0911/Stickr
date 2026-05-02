"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CircleArrowDown,
  CircleArrowUp,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import {
  cancelMarketIntentAction,
  createMarketIntentAction,
} from "@/app/actions/marketplace";
import { openMarketplaceThreadAction } from "@/app/actions/messages";
import { formatMinorCurrency } from "@/lib/format-currency";
import { formatIntegerEs, APP_NUMBER_LOCALE } from "@/lib/format-numbers";
import {
  isMarketCurrency,
  MARKET_CURRENCY_CODES,
  MARKET_CURRENCY_UI,
  type MarketCurrencyCode,
} from "@/lib/marketplace/currency";
import type { MarketFeedIntent } from "@/lib/marketplace/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const scopeHelp =
  "Solo encuentro local: cara a cara sin envío nacional. Nacional: aceptas u ofreces envío dentro del país.";

function scopeLabel(scope: MarketFeedIntent["shippingScope"]) {
  return scope === "national" ? "Envío nacional" : "Solo local";
}

function formatPublishedAt(iso: string | null): string {
  if (!iso) return "hace un momento";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "hace un momento";
  try {
    return new Intl.DateTimeFormat(APP_NUMBER_LOCALE, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "hace un momento";
  }
}

type IntentDialogProps = {
  kind: "buy" | "sell";
  editionLabel: string;
  suggestedCurrency: MarketCurrencyCode;
};

function IntentDialog({
  kind,
  editionLabel,
  suggestedCurrency,
}: IntentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"local_only" | "national">("local_only");
  const initialCurrency: MarketCurrencyCode = isMarketCurrency(
    suggestedCurrency,
  )
    ? suggestedCurrency
    : "USD";
  const [currency, setCurrency] = useState<MarketCurrencyCode>(initialCurrency);
  const [pending, startTransition] = useTransition();

  const title = kind === "buy" ? "Quiero comprar" : "Quiero vender";
  const desc =
    kind === "buy"
      ? `Indica el número de la figurita de tu lista ${editionLabel}; si solo quieres entrega cara a cara o también con envío nacional, y el máximo que pagarías.`
      : `Indica el número de la figurita de tu lista ${editionLabel}, el alcance (local frente a nacional) y el precio al que vendes.`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={kind === "buy" ? "default" : "outline"}
          size="lg"
          className={cn(
            "inline-flex min-h-12 w-full gap-2.5 rounded-2xl px-5 py-3 text-[0.9375rem] font-semibold tracking-tight shadow-sm sm:min-h-11 sm:flex-1 sm:px-6",
            kind === "buy" && "shadow-primary/25 hover:bg-primary/90 shadow-md",
            kind === "sell" &&
              "border-muted-foreground/20 bg-background hover:bg-muted/40 border-2",
          )}
        >
          {kind === "buy" ? (
            <CircleArrowDown className="size-5 shrink-0" aria-hidden />
          ) : (
            <CircleArrowUp className="size-5 shrink-0" aria-hidden />
          )}
          {kind === "buy" ? "Comprar" : "Vender"}
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton className="gap-6 sm:max-w-lg">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="font-heading text-xl leading-tight font-semibold tracking-tight md:text-[1.35rem]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[0.8125rem] leading-relaxed sm:text-sm">
            {desc}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            formData.set("kind", kind);
            formData.set("shippingScope", scope);
            formData.set("currency", currency);
            startTransition(async () => {
              const res = await createMarketIntentAction(formData);
              if (res.ok && res.data?.summary) {
                toast.success(res.data.summary);
                setOpen(false);
                router.refresh();
              } else if (!res.ok) {
                toast.error(res.message);
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={`stk-${kind}`}>Número de figurita</Label>
            <Input
              id={`stk-${kind}`}
              name="stickerNumber"
              type="number"
              inputMode="numeric"
              min={1}
              max={99999}
              required
              placeholder="Ej. 12"
              className="rounded-xl"
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs leading-relaxed">
              Es el mismo número que ves en el álbum dentro de tu edición (
              {editionLabel}).
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-medium">
              Alcance del intercambio
            </Label>
            <div
              role="radiogroup"
              aria-label="Alcance"
              className="bg-muted/70 border-border/60 grid grid-cols-2 gap-1 rounded-xl border p-1"
            >
              <Button
                type="button"
                role="radio"
                aria-checked={scope === "local_only"}
                variant={scope === "local_only" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "hover:bg-muted/80 relative h-auto min-h-[2.75rem] shrink-0 rounded-lg px-2 py-2.5 text-center text-[0.8125rem] leading-snug font-medium shadow-none",
                  scope === "local_only" &&
                    "bg-background ring-border/80 shadow-sm ring-1",
                )}
                onClick={() => setScope("local_only")}
                disabled={pending}
              >
                Solo encuentro local
              </Button>
              <Button
                type="button"
                role="radio"
                aria-checked={scope === "national"}
                variant={scope === "national" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "hover:bg-muted/80 relative h-auto min-h-[2.75rem] shrink-0 rounded-lg px-2 py-2.5 text-center text-[0.8125rem] leading-snug font-medium shadow-none",
                  scope === "national" &&
                    "bg-background ring-border/80 shadow-sm ring-1",
                )}
                onClick={() => setScope("national")}
                disabled={pending}
              >
                Incluye envío nacional
              </Button>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {scopeHelp}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`cur-${kind}`}>Moneda</Label>
            <select
              id={`cur-${kind}`}
              value={currency}
              disabled={pending}
              onChange={(e) => {
                const v = e.target.value;
                setCurrency(isMarketCurrency(v) ? v : "USD");
              }}
              className={cn(
                "border-input bg-background text-foreground focus-visible:ring-ring h-10 w-full rounded-xl border px-3 text-sm shadow-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {MARKET_CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {`${MARKET_CURRENCY_UI[code].label} · ${MARKET_CURRENCY_UI[code].hint}`}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Valor sugerido según el país en tu perfil; puedes elegir
              cualquiera de estas cuatro monedas.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`price-${kind}`}>
              {kind === "buy"
                ? `Precio máximo a pagar (${currency})`
                : `Precio de venta (${currency})`}
            </Label>
            <Input
              id={`price-${kind}`}
              name="priceMajor"
              inputMode="decimal"
              placeholder="Ej. 15.000 o 2500"
              autoComplete="off"
              required
              className="rounded-xl font-medium tabular-nums"
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs leading-relaxed">
              Puedes escribir con puntos de miles (ej.{" "}
              <span className="tabular-nums">15.000</span>). Decimales con coma
              ( ej. <span className="tabular-nums">15.000,50</span>). Sin puntos
              de miles: <span className="tabular-nums">4200</span> o{" "}
              <span className="tabular-nums">4200,50</span>.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-2xl font-semibold tracking-tight sm:w-auto"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2
                    className="size-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                  Publicando…
                </>
              ) : kind === "buy" ? (
                "Publicar búsqueda"
              ) : (
                "Publicar venta"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  editionLabel: string;
  defaultCurrency: MarketCurrencyCode;
  intents: MarketFeedIntent[];
  feedError: string | null;
  currentUserId: string | null;
};

export function MarketplacePanel({
  editionLabel,
  defaultCurrency,
  intents,
  feedError,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [cancelPendingId, setCancelPendingId] = useState<string | null>(null);
  const [contactPendingId, setContactPendingId] = useState<string | null>(null);

  const cancelIntent = (id: string) => {
    setCancelPendingId(id);
    void (async () => {
      const res = await cancelMarketIntentAction(id);
      setCancelPendingId(null);
      if (res.ok) {
        toast.success(
          typeof res.data === "string" ? res.data : "Publicación cancelada.",
        );
        router.refresh();
      } else {
        toast.error(res.message);
      }
    })();
  };

  const contactAboutIntent = (intentId: string) => {
    setContactPendingId(intentId);
    void (async () => {
      const res = await openMarketplaceThreadAction(intentId);
      setContactPendingId(null);
      if (res.ok && res.data?.conversationId) {
        router.push(`/messages/${res.data.conversationId}`);
      } else if (!res.ok) {
        toast.error(res.message);
      }
    })();
  };

  return (
    <div className="space-y-10 md:space-y-14">
      <section className="space-y-4">
        <div className="max-w-xl space-y-1.5">
          <h2 className="font-heading text-lg font-semibold tracking-tight md:text-xl">
            Nueva publicación
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed md:text-[0.9375rem] md:leading-snug">
            Publica lo que buscas u ofreces; el acuerdo y el pago quedan fuera
            de Stickr por ahora (sin escrow en esta fase).
          </p>
        </div>
        <div className="border-border/70 bg-muted/25 rounded-2xl border p-4 shadow-sm sm:p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <IntentDialog
              key={`buy-${defaultCurrency}`}
              kind="buy"
              editionLabel={editionLabel}
              suggestedCurrency={defaultCurrency}
            />
            <IntentDialog
              key={`sell-${defaultCurrency}`}
              kind="sell"
              editionLabel={editionLabel}
              suggestedCurrency={defaultCurrency}
            />
          </div>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Tip mobile: usa números simples (ej. 15 o 120) y para decimales usa
            coma (ej. 15,5).
          </p>
        </div>
      </section>

      <section className="space-y-4 md:space-y-5">
        <div className="max-w-xl space-y-1.5">
          <h2 className="font-heading text-lg font-semibold tracking-tight md:text-xl">
            Ofertas abiertas
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed md:text-[0.9375rem] md:leading-snug">
            Orden cronológico. Los precios reflejan intenciones, no están
            ejecutados dentro de Stickr.
          </p>
        </div>

        {feedError ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm leading-relaxed"
          >
            {feedError}
          </p>
        ) : intents.length === 0 ? (
          <Card className="border-border/80 bg-muted/15 rounded-2xl border-dashed shadow-none">
            <CardContent className="text-muted-foreground px-6 py-12 text-center text-sm leading-relaxed">
              Todavía no hay compras ni ventas publicadas. Sé el primero con los
              botones de arriba.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:gap-5">
            {intents.map((row) => {
              const stickerNum = Number(row.stickerNumber);
              const priceCents = Number(row.priceCents);
              const mine = Boolean(
                currentUserId && row.userId === currentUserId,
              );
              const displayUsername =
                typeof row.username === "string" &&
                row.username.trim().length > 0
                  ? row.username.trim()
                  : "coleccionista";
              return (
                <li key={row.id}>
                  <Card
                    className={cn(
                      "border-border/70 rounded-2xl shadow-sm transition-shadow hover:shadow-md",
                      mine && "ring-primary/25 ring-2",
                    )}
                  >
                    <CardHeader className="space-y-2 pb-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <CardTitle className="font-heading min-w-0 text-sm font-semibold tracking-tight sm:text-base">
                          @{displayUsername}
                        </CardTitle>
                        <Badge
                          variant={row.kind === "buy" ? "secondary" : "default"}
                          className="rounded-full px-2 py-0.5 text-[11px] capitalize sm:text-xs"
                        >
                          {row.kind === "buy" ? "Busca comprar" : "Vende"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-full px-2 py-0.5 font-mono text-[11px] sm:text-xs"
                        >
                          {row.currency}
                        </Badge>
                      </div>
                      <CardDescription className="text-muted-foreground text-xs leading-snug sm:text-[0.8125rem]">
                        Figurita n.º{" "}
                        <span className="text-foreground font-medium tracking-tight tabular-nums">
                          {formatIntegerEs(
                            Number.isFinite(stickerNum) ? stickerNum : 0,
                          )}
                        </span>{" "}
                        · {scopeLabel(row.shippingScope)} · Catálogo{" "}
                        {row.albumEdition}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      <p className="text-foreground text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
                        {row.kind === "buy"
                          ? `Hasta ${formatMinorCurrency(
                              Number.isFinite(priceCents) ? priceCents : 0,
                              row.currency,
                            )}`
                          : formatMinorCurrency(
                              Number.isFinite(priceCents) ? priceCents : 0,
                              row.currency,
                            )}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        Publicado {formatPublishedAt(row.createdAt)}
                      </p>
                    </CardContent>
                    {mine ? (
                      <CardFooter className="border-border/50 border-t pt-3 pb-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-muted-foreground rounded-xl text-xs font-medium sm:text-sm"
                          disabled={cancelPendingId === row.id}
                          onClick={() => cancelIntent(row.id)}
                        >
                          {cancelPendingId === row.id ? (
                            <>
                              <Loader2
                                className="mr-2 size-3.5 shrink-0 animate-spin"
                                aria-hidden
                              />
                              Cancelando…
                            </>
                          ) : (
                            "Cancelar mi publicación"
                          )}
                        </Button>
                      </CardFooter>
                    ) : (
                      <CardFooter className="border-border/50 flex flex-wrap gap-2 border-t pt-3 pb-4">
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl text-xs font-medium sm:text-sm"
                          disabled={contactPendingId === row.id}
                          onClick={() => contactAboutIntent(row.id)}
                        >
                          {contactPendingId === row.id ? (
                            <>
                              <Loader2
                                className="mr-2 size-3.5 shrink-0 animate-spin"
                                aria-hidden
                              />
                              Abriendo…
                            </>
                          ) : (
                            <>
                              <MessageSquare
                                className="mr-2 size-3.5 shrink-0"
                                aria-hidden
                              />
                              Contactar
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
