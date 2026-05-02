"use client";

import { MarketplacePanelBoundary } from "@/components/features/marketplace-panel-boundary";
import {
  MarketplacePanelClient,
  type MarketplacePanelClientProps,
} from "@/components/features/marketplace-panel-client";

/**
 * Contenedor cliente del panel + boundary por si el árbol Radix/Dialog falla al montar.
 */
export function MarketplacePanelGate(props: MarketplacePanelClientProps) {
  return (
    <MarketplacePanelBoundary>
      <MarketplacePanelClient {...props} />
    </MarketplacePanelBoundary>
  );
}
