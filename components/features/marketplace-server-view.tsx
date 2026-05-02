import { MessageSquare } from "lucide-react";

import {
  marketplaceCancelIntentFormAction,
  marketplaceOpenThreadFormAction,
  marketplaceSubmitIntentFormAction,
} from "@/app/actions/marketplace-forms";
import { formatMinorCurrency } from "@/lib/format-currency";
import { formatIntegerEs, APP_NUMBER_LOCALE } from "@/lib/format-numbers";
import {
  isMarketCurrency,
  MARKET_CURRENCY_CODES,
  MARKET_CURRENCY_UI,
  type MarketCurrencyCode,
} from "@/lib/marketplace/currency";
import type { MarketFeedIntent } from "@/lib/marketplace/types";
import { cn } from "@/lib/utils";

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
import { Input } from "@/components/ui/input";

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

const labelClass =
  "flex items-center gap-2 text-sm leading-none font-medium select-none";

const selectClass = cn(
  "border-input bg-background text-foreground focus-visible:ring-ring h-10 w-full rounded-xl border px-3 text-sm shadow-sm outline-none focus-visible:ring-2",
);

type Props = {
  editionLabel: string;
  defaultCurrency: MarketCurrencyCode;
  intents: MarketFeedIntent[];
  feedError: string | null;
  currentUserId: string | null;
  flashOk: boolean;
  flashCancelled: boolean;
  flashErr: string | null;
};

function IntentPublicationForm({
  kind,
  editionLabel,
  defaultCurrency,
}: {
  kind: "buy" | "sell";
  editionLabel: string;
  defaultCurrency: MarketCurrencyCode;
}) {
  const safeCcy = isMarketCurrency(defaultCurrency) ? defaultCurrency : "USD";
  const title = kind === "buy" ? "Quiero comprar" : "Quiero vender";
  const desc =
    kind === "buy"
      ? `Número de figurita de tu lista ${editionLabel}; alcance (local o nacional) y el máximo que pagarías.`
      : `Número de figurita de tu lista ${editionLabel}, alcance y precio de venta.`;

  return (
    <div className="border-border/60 bg-card/40 flex flex-col gap-3 rounded-xl border p-4 sm:p-5">
      <div className="space-y-1">
        <h3 className="font-heading text-base font-semibold tracking-tight">
          {title}
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
          {desc}
        </p>
      </div>
      <form action={marketplaceSubmitIntentFormAction} className="grid gap-3">
        <input type="hidden" name="kind" value={kind} />
        <div className="space-y-2">
          <label htmlFor={`stk-${kind}`} className={labelClass}>
            Número de figurita
          </label>
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
          />
          <p className="text-muted-foreground text-xs leading-relaxed">
            Mismo número que en el álbum ({editionLabel}).
          </p>
        </div>
        <div className="space-y-2">
          <span className={labelClass}>Alcance</span>
          <select
            name="shippingScope"
            required
            defaultValue="local_only"
            className={selectClass}
            aria-label="Alcance del intercambio"
          >
            <option value="local_only">Solo encuentro local</option>
            <option value="national">Incluye envío nacional</option>
          </select>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {scopeHelp}
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor={`cur-${kind}`} className={labelClass}>
            Moneda
          </label>
          <select
            id={`cur-${kind}`}
            name="currency"
            required
            defaultValue={safeCcy}
            className={selectClass}
          >
            {MARKET_CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {`${MARKET_CURRENCY_UI[code].label} · ${MARKET_CURRENCY_UI[code].hint}`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor={`price-${kind}`} className={labelClass}>
            {kind === "buy" ? "Precio máximo a pagar" : "Precio de venta"}
          </label>
          <Input
            id={`price-${kind}`}
            name="priceMajor"
            inputMode="decimal"
            placeholder="Ej. 15.000 o 2500"
            autoComplete="off"
            required
            className="rounded-xl font-medium tabular-nums"
          />
          <p className="text-muted-foreground text-xs leading-relaxed">
            Puntos de miles o coma decimal (ej. 15.000,50).
          </p>
        </div>
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            size="lg"
            className="w-full rounded-2xl font-semibold tracking-tight sm:w-auto"
          >
            {kind === "buy" ? "Publicar búsqueda" : "Publicar venta"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function MarketplaceServerView({
  editionLabel,
  defaultCurrency,
  intents,
  feedError,
  currentUserId,
  flashOk,
  flashCancelled,
  flashErr,
}: Props) {
  return (
    <div className="space-y-10 md:space-y-14">
      {(flashOk || flashCancelled || flashErr) && (
        <div className="space-y-2" role="status">
          {flashOk ? (
            <p className="border-primary/25 bg-primary/10 text-foreground rounded-xl border px-4 py-3 text-sm leading-relaxed">
              Publicación creada correctamente.
            </p>
          ) : null}
          {flashCancelled ? (
            <p className="border-primary/25 bg-primary/10 text-foreground rounded-xl border px-4 py-3 text-sm leading-relaxed">
              Publicación cancelada.
            </p>
          ) : null}
          {flashErr ? (
            <p
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm leading-relaxed"
            >
              {flashErr}
            </p>
          ) : null}
        </div>
      )}

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
          <div className="grid gap-6 lg:grid-cols-2">
            <IntentPublicationForm
              kind="buy"
              editionLabel={editionLabel}
              defaultCurrency={defaultCurrency}
            />
            <IntentPublicationForm
              kind="sell"
              editionLabel={editionLabel}
              defaultCurrency={defaultCurrency}
            />
          </div>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Tras enviar, la página se recarga sola. Si algo falla, verás el
            mensaje arriba.
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
              formularios de arriba.
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
                        <form action={marketplaceCancelIntentFormAction}>
                          <input type="hidden" name="intentId" value={row.id} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="text-muted-foreground rounded-xl text-xs font-medium sm:text-sm"
                          >
                            Cancelar mi publicación
                          </Button>
                        </form>
                      </CardFooter>
                    ) : (
                      <CardFooter className="border-border/50 flex flex-wrap gap-2 border-t pt-3 pb-4">
                        <form action={marketplaceOpenThreadFormAction}>
                          <input type="hidden" name="intentId" value={row.id} />
                          <Button
                            type="submit"
                            size="sm"
                            className="rounded-xl text-xs font-medium sm:text-sm"
                          >
                            <MessageSquare
                              className="mr-2 size-3.5 shrink-0"
                              aria-hidden
                            />
                            Contactar
                          </Button>
                        </form>
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
