"use client";

import {
  MarketplacePanelClient,
  type MarketplacePanelClientProps,
} from "@/components/features/marketplace-panel-client";

/**
 * Contenedor cliente del panel. Import estático (sin `next/dynamic` + `ssr:false`)
 * para evitar fallos en producción al hidratar o al cargar el chunk aparte.
 */
export function MarketplacePanelGate(props: MarketplacePanelClientProps) {
  return <MarketplacePanelClient {...props} />;
}
