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
  intents: MarketFeedIntent[];
  feedError: string | null;
  currentUserId: string | null;
};

export function MarketplacePanelClient(props: MarketplacePanelClientProps) {
  const defaultCurrency: MarketCurrencyCode = isMarketCurrency(
    props.defaultCurrency,
  )
    ? props.defaultCurrency
    : "USD";

  const intents: MarketFeedIntent[] = props.intents.map((row) => ({
    ...row,
    username: typeof row.username === "string" ? row.username : null,
  }));

  return (
    <MarketplacePanel
      {...props}
      defaultCurrency={defaultCurrency}
      intents={intents}
    />
  );
}
