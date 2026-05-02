"use client";

import dynamic from "next/dynamic";

import type { MarketplacePanelClientProps } from "@/components/features/marketplace-panel-client";

const MarketplacePanelClient = dynamic(
  () =>
    import("@/components/features/marketplace-panel-client").then((m) => ({
      default: m.MarketplacePanelClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="text-muted-foreground rounded-2xl border border-dashed px-4 py-12 text-center text-sm"
        role="status"
        aria-live="polite"
      >
        Cargando compra/venta…
      </div>
    ),
  },
);

/** Carga el panel solo en el cliente (Next 16 no permite ssr:false en Server Components). */
export function MarketplacePanelGate(props: MarketplacePanelClientProps) {
  return <MarketplacePanelClient {...props} />;
}
