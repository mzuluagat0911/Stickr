import { Compass } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function DiscoverPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Descubrir</h1>
      <EmptyState
        icon={Compass}
        title="Descubrir coleccionistas cerca tuyo"
        description="En las próximas fases vas a ver un mapa y sugerencias según tu ubicación y colección."
      />
    </div>
  );
}
