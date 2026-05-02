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
      out.push({
        id: r.id,
        stickerNumber: Number(r.stickerNumber),
        stickerId: typeof r.stickerId === "string" ? r.stickerId : "",
        kind: r.kind === "sell" ? "sell" : "buy",
        shippingScope:
          r.shippingScope === "national" ? "national" : "local_only",
        priceCents: Number(r.priceCents),
        currency: typeof r.currency === "string" ? r.currency : "ARS",
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
  const defaultCurrency: MarketCurrencyCode = isMarketCurrency(
    props.defaultCurrency,
  )
    ? props.defaultCurrency
    : "USD";

  const intents = parseIntentsJson(props.intentsJson);

  return (
    <MarketplacePanel
      editionLabel={props.editionLabel}
      defaultCurrency={defaultCurrency}
      intents={intents}
      feedError={props.feedError}
      currentUserId={props.currentUserId}
    />
  );
}
