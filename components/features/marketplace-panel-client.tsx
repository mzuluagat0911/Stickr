"use client";

import dynamic from "next/dynamic";

import type { MarketCurrencyCode } from "@/lib/marketplace/currency";
import type { MarketFeedIntent } from "@/lib/marketplace/types";

const MarketplacePanel = dynamic(
  () =>
    import("@/components/features/marketplace-panel").then((m) => ({
      default: m.MarketplacePanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="text-muted-foreground rounded-2xl border border-dashed px-4 py-10 text-center text-sm"
        role="status"
        aria-live="polite"
      >
        Cargando compra/venta…
      </div>
    ),
  },
);

export type MarketplacePanelClientProps = {
  editionLabel: string;
  defaultCurrency: MarketCurrencyCode;
  intents: MarketFeedIntent[];
  feedError: string | null;
  currentUserId: string | null;
};

export function MarketplacePanelClient(props: MarketplacePanelClientProps) {
  return <MarketplacePanel {...props} />;
}
