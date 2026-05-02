"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

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
        {error.message ? (
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
