import {
  AlertCircle,
  CheckCircle2,
  CircleArrowDown,
  CircleArrowUp,
  MessageSquare,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";

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
  "border-input bg-background text-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2",
);

function sortIntentsForDisplay(
  intents: MarketFeedIntent[],
  currentUserId: string | null,
): MarketFeedIntent[] {
  const uid = currentUserId?.trim();
  return [...intents].sort((a, b) => {
    const am = Boolean(uid && a.userId === uid);
    const bm = Boolean(uid && b.userId === uid);
    if (am !== bm) return am ? -1 : 1;
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

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

function FlashMessages({
  flashOk,
  flashCancelled,
  flashErr,
}: Pick<Props, "flashOk" | "flashCancelled" | "flashErr">) {
  if (!flashOk && !flashCancelled && !flashErr) return null;
  return (
    <div
      className="border-border/60 bg-card/80 scroll-mt-24 space-y-3 rounded-2xl border p-4 shadow-sm backdrop-blur-sm sm:p-5"
      role="region"
      aria-label="Resultado de la última acción"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Aviso
        </p>
        <Link
          href="/marketplace"
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
        >
          <X className="size-3.5" aria-hidden />
          Cerrar
        </Link>
      </div>
      {flashOk ? (
        <div className="border-primary/20 bg-primary/8 flex gap-3 rounded-xl border px-3 py-3 sm:px-4">
          <CheckCircle2
            className="text-primary mt-0.5 size-5 shrink-0"
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <p className="text-foreground text-sm leading-snug font-semibold">
              Publicación creada
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Ya aparece en ofertas abiertas. Podés seguir publicando o
              contactar a otros desde la lista.
            </p>
          </div>
        </div>
      ) : null}
      {flashCancelled ? (
        <div className="border-muted-foreground/25 bg-muted/40 flex gap-3 rounded-xl border px-3 py-3 sm:px-4">
          <CheckCircle2
            className="text-muted-foreground mt-0.5 size-5 shrink-0"
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <p className="text-foreground text-sm leading-snug font-semibold">
              Publicación cancelada
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Dejó de mostrarse en el listado.
            </p>
          </div>
        </div>
      ) : null}
      {flashErr ? (
        <div className="border-destructive/35 bg-destructive/8 flex gap-3 rounded-xl border px-3 py-3 sm:px-4">
          <AlertCircle
            className="text-destructive mt-0.5 size-5 shrink-0"
            aria-hidden
          />
          <p
            role="alert"
            className="text-destructive min-w-0 text-sm leading-relaxed"
          >
            {flashErr}
          </p>
        </div>
      ) : null}
    </div>
  );
}

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
  const isBuy = kind === "buy";
  const title = isBuy ? "Quiero comprar" : "Quiero vender";
  const desc = isBuy
    ? `Número de figurita de tu lista ${editionLabel}; alcance y el máximo que pagarías.`
    : `Número de figurita de tu lista ${editionLabel}, alcance y precio de venta.`;

  return (
    <div
      className={cn(
        "bg-card/50 flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:p-5",
        isBuy
          ? "border-l-[3px] border-sky-500/35 border-l-sky-500"
          : "border-l-[3px] border-emerald-600/35 border-l-emerald-600",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            isBuy
              ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
              : "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300",
          )}
          aria-hidden
        >
          {isBuy ? (
            <CircleArrowDown className="size-5" />
          ) : (
            <CircleArrowUp className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="font-heading text-base font-semibold tracking-tight">
            {title}
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
            {desc}
          </p>
        </div>
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
            className="h-11 rounded-xl"
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
            {isBuy ? "Precio máximo a pagar" : "Precio de venta"}
          </label>
          <Input
            id={`price-${kind}`}
            name="priceMajor"
            inputMode="decimal"
            placeholder="Ej. 15.000 o 2500"
            autoComplete="off"
            required
            className="h-11 rounded-xl font-medium tabular-nums"
          />
          <p className="text-muted-foreground text-xs leading-relaxed">
            Puntos de miles o coma decimal (ej. 15.000,50).
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            size="lg"
            variant={isBuy ? "default" : "secondary"}
            className="w-full rounded-2xl font-semibold tracking-tight sm:w-auto sm:min-w-44"
          >
            {isBuy ? "Publicar búsqueda" : "Publicar venta"}
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
  const sortedIntents = sortIntentsForDisplay(intents, currentUserId);

  return (
    <div className="space-y-10 md:space-y-12">
      <FlashMessages
        flashOk={flashOk}
        flashCancelled={flashCancelled}
        flashErr={flashErr}
      />

      <nav
        className="border-border/50 bg-muted/30 -mx-1 flex flex-wrap gap-2 rounded-xl border px-3 py-2.5 sm:mx-0 sm:px-4"
        aria-label="Atajos en la página"
      >
        <span className="text-muted-foreground w-full text-[11px] font-medium tracking-wide uppercase sm:w-auto sm:py-1">
          Ir a
        </span>
        <a
          href="#publicar"
          className="bg-background/90 text-foreground ring-border/60 hover:bg-muted inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition-colors"
        >
          Nueva publicación
        </a>
        <a
          href="#ofertas"
          className="bg-background/90 text-foreground ring-border/60 hover:bg-muted inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition-colors"
        >
          Ofertas abiertas
        </a>
      </nav>

      <section
        id="publicar"
        className="scroll-mt-24 space-y-4"
        aria-labelledby="heading-publicar"
      >
        <div className="max-w-xl space-y-1.5">
          <h2
            id="heading-publicar"
            className="font-heading text-lg font-semibold tracking-tight md:text-xl"
          >
            Nueva publicación
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed md:text-[0.9375rem] md:leading-snug">
            Completá un formulario y enviá: la página se actualiza sola. El
            acuerdo y el pago siguen fuera de Stickr en esta fase (sin depósito
            en la app).
          </p>
        </div>
        <div className="border-border/70 bg-muted/20 rounded-2xl border p-4 shadow-sm sm:p-5 md:p-6">
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
          <p className="text-muted-foreground mt-4 flex items-start gap-2 border-t border-dashed pt-4 text-xs leading-relaxed">
            <span className="text-foreground/70 mt-0.5 font-mono text-[10px]">
              ↵
            </span>
            Tip: en móvil podés usar números simples y coma para decimales (ej.{" "}
            <span className="tabular-nums">15,5</span>).
          </p>
        </div>
      </section>

      <section
        id="ofertas"
        className="scroll-mt-24 space-y-4 md:space-y-5"
        aria-labelledby="heading-ofertas"
      >
        <div className="max-w-xl space-y-1.5">
          <h2
            id="heading-ofertas"
            className="font-heading text-lg font-semibold tracking-tight md:text-xl"
          >
            Ofertas abiertas
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed md:text-[0.9375rem] md:leading-snug">
            Lo más reciente primero; tus publicaciones aparecen arriba si estás
            identificado.
          </p>
        </div>

        {feedError ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm leading-relaxed"
          >
            {feedError}
          </p>
        ) : sortedIntents.length === 0 ? (
          <Card className="border-border/80 bg-muted/15 rounded-2xl border-dashed shadow-none">
            <CardContent className="text-muted-foreground flex flex-col items-center gap-3 px-6 py-14 text-center text-sm leading-relaxed">
              <span className="bg-muted flex size-14 items-center justify-center rounded-2xl">
                <Store className="text-muted-foreground size-7" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-foreground font-medium">
                  Todavía no hay ofertas
                </p>
                <p>Sé el primero publicando una búsqueda o una venta arriba.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:gap-5">
            {sortedIntents.map((row) => {
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
                      "border-border/70 flex h-full flex-col rounded-2xl shadow-sm transition-[box-shadow,transform] duration-200 hover:shadow-md",
                      mine &&
                        "ring-primary/30 border-primary/20 bg-primary/[0.03] ring-2",
                    )}
                  >
                    <CardHeader className="space-y-2 pb-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <CardTitle className="font-heading min-w-0 text-sm font-semibold tracking-tight sm:text-base">
                          @{displayUsername}
                        </CardTitle>
                        {mine ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-[11px]"
                          >
                            Tuya
                          </Badge>
                        ) : null}
                        <Badge
                          variant={row.kind === "buy" ? "secondary" : "default"}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] capitalize sm:text-xs"
                        >
                          {row.kind === "buy" ? (
                            <CircleArrowDown className="size-3" aria-hidden />
                          ) : (
                            <CircleArrowUp className="size-3" aria-hidden />
                          )}
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
                        <span className="text-foreground font-semibold tracking-tight tabular-nums">
                          {formatIntegerEs(
                            Number.isFinite(stickerNum) ? stickerNum : 0,
                          )}
                        </span>{" "}
                        · {scopeLabel(row.shippingScope)} ·{" "}
                        <span className="text-foreground/90">
                          {row.albumEdition}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col space-y-2 pb-4">
                      <div className="bg-muted/50 rounded-xl px-3 py-2.5">
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
                      </div>
                      <p className="text-muted-foreground mt-auto text-xs tabular-nums">
                        Publicado {formatPublishedAt(row.createdAt)}
                      </p>
                    </CardContent>
                    {mine ? (
                      <CardFooter className="border-border/50 mt-auto border-t pt-3 pb-4">
                        <form action={marketplaceCancelIntentFormAction}>
                          <input type="hidden" name="intentId" value={row.id} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 border-destructive/30 rounded-xl text-xs font-medium sm:text-sm"
                          >
                            Cancelar publicación
                          </Button>
                        </form>
                      </CardFooter>
                    ) : (
                      <CardFooter className="border-border/50 mt-auto flex flex-wrap gap-2 border-t pt-3 pb-4">
                        <form action={marketplaceOpenThreadFormAction}>
                          <input type="hidden" name="intentId" value={row.id} />
                          <Button
                            type="submit"
                            variant="default"
                            size="sm"
                            className="rounded-xl text-xs font-medium shadow-sm sm:text-sm"
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
