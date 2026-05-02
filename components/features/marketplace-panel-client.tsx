"use client";

import { MarketplacePanel } from "@/components/features/marketplace-panel";
import {
  isMarketCurrency,
  type MarketCurrencyCode,
} from "@/lib/marketplace/currency";
import type { MarketFeedIntent } from "@/lib/marketplace/types";

export type MarketplacePanelClientProps = {
  editionLabel: string;
  defaultCurrency: MarketCurrencyCode;
  /** JSON serializado en el servidor para evitar fallos del Flight con arrays complejos. */
  intentsJson: string;
  feedError: string | null;
  currentUserId: string | null;
};

function parseIntentsJson(raw: string): MarketFeedIntent[] {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: MarketFeedIntent[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.id !== "string" || typeof r.userId !== "string") continue;
      const rawCcy = typeof r.currency === "string" ? r.currency.trim() : "";
      const currency = isMarketCurrency(rawCcy) ? rawCcy : "ARS";
      out.push({
        id: r.id,
        stickerNumber: Number(r.stickerNumber),
        stickerId: typeof r.stickerId === "string" ? r.stickerId : "",
        kind: r.kind === "sell" ? "sell" : "buy",
        shippingScope:
          r.shippingScope === "national" ? "national" : "local_only",
        priceCents: Number(r.priceCents),
        currency,
        albumEdition:
          typeof r.albumEdition === "string"
            ? r.albumEdition
            : "PR-International",
        createdAt: typeof r.createdAt === "string" ? r.createdAt : null,
        userId: r.userId,
        username: typeof r.username === "string" ? r.username : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function MarketplacePanelClient(props: MarketplacePanelClientProps) {
  const intentsJson =
    typeof props.intentsJson === "string" ? props.intentsJson : "[]";
  const editionLabel =
    typeof props.editionLabel === "string" &&
    props.editionLabel.trim().length > 0
      ? props.editionLabel.trim()
      : "PR-International";

  const defaultCurrency: MarketCurrencyCode = isMarketCurrency(
    props.defaultCurrency,
  )
    ? props.defaultCurrency
    : "USD";

  const intents = parseIntentsJson(intentsJson);

  return (
    <MarketplacePanel
      editionLabel={editionLabel}
      defaultCurrency={defaultCurrency}
      intents={intents}
      feedError={props.feedError ?? null}
      currentUserId={
        typeof props.currentUserId === "string" || props.currentUserId === null
          ? props.currentUserId
          : null
      }
    />
  );
}
