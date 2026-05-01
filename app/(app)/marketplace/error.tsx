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
      </header>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => reset()}>
          Reintentar
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/album">Ir al álbum</a>
        </Button>
      </div>
      {process.env.NODE_ENV === "development" && error.message ? (
        <pre className="bg-muted/50 max-h-40 overflow-auto rounded-xl p-3 text-xs whitespace-pre-wrap">
          {error.message}
        </pre>
      ) : null}
    </div>
  );
}
