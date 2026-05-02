"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Evita que un fallo al montar el panel deje toda la ruta en blanco;
 * muestra mensaje y opción de recargar.
 */
export class MarketplacePanelBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[marketplace-panel]", error.message, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      const digest =
        "digest" in this.state.error
          ? String(
              (this.state.error as Error & { digest?: unknown }).digest ?? "",
            )
          : "";
      return (
        <div
          className="border-destructive/30 bg-destructive/5 space-y-4 rounded-2xl border p-6"
          role="alert"
        >
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Compra/venta no disponible
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            El panel no pudo iniciarse en este dispositivo. Prueba recargar la
            página; si sigue igual, revisa los logs del despliegue con el digest
            (si aparece).
          </p>
          {digest ? (
            <p className="text-muted-foreground bg-muted/40 rounded-lg border px-3 py-2 font-mono text-xs break-all">
              Digest: {digest}
            </p>
          ) : null}
          <Button type="button" onClick={() => window.location.reload()}>
            Recargar página
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
