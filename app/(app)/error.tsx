"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
      <h2 className="text-lg font-semibold tracking-tight">Algo salió mal</h2>
      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
        {error.message || "Intenta de nuevo en unos segundos."}
      </p>
      <Button type="button" onClick={() => reset()}>
        Reintentar
      </Button>
    </div>
  );
}
