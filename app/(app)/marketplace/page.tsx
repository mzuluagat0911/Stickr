import { ShoppingBag } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function MarketplacePage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Mercado</h1>
      <EmptyState
        icon={ShoppingBag}
        title="Mercado de figuritas"
        description="Publicá lo que te sobra y encontrá lo que te falta con precios y reputación."
      />
    </div>
  );
}
