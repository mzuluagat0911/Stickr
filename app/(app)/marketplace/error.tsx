"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

function isGenericProductionRscMessage(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("omitted in production") ||
    message.includes("Server Components render") ||
    message.includes("digest property is included")
  );
}

export default function MarketplaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[marketplace]", error);
  }, [error]);

  const showRawMessage =
    error.message && !isGenericProductionRscMessage(error.message);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Compra/venta
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
          Algo salió mal al mostrar esta sección. Puedes reintentar o volver al
          álbum.
        </p>
        {isGenericProductionRscMessage(error.message) ? (
          <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
            En producción el detalle técnico no se muestra por seguridad. El
            digest de abajo sirve para buscar la causa en los logs del servidor
            (p. ej. Vercel → Functions / Runtime logs).
          </p>
        ) : null}
        {showRawMessage ? (
          <p
            className="text-muted-foreground bg-muted/30 max-w-xl rounded-xl border px-3 py-2 font-mono text-xs leading-relaxed break-words"
            role="status"
          >
            {error.message}
          </p>
        ) : null}
        {error.digest ? (
          <p
            className="text-muted-foreground bg-muted/30 max-w-xl rounded-xl border px-3 py-2 font-mono text-xs leading-relaxed break-all"
            role="status"
          >
            Digest (soporte / logs): {error.digest}
          </p>
        ) : null}
      </header>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => reset()}>
          Reintentar
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/album">Ir al álbum</a>
        </Button>
      </div>
    </div>
  );
}
