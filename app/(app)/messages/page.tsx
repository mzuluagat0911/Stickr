import { MessageCircle } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function MessagesPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Mensajes</h1>
      <EmptyState
        icon={MessageCircle}
        title="Tus conversaciones"
        description="Aquí podrás chatear con otros coleccionistas para coordinar intercambios (pronto)."
      />
    </div>
  );
}
