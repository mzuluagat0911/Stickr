import { redirect } from "next/navigation";

import { shouldRethrowFromRsc } from "@/lib/next/rsc-rethrow";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";

import { MarketplaceBody } from "./marketplace-body";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  if (!hasPublicSupabaseConfig()) {
    redirect("/login");
  }

  try {
    return await MarketplaceBody();
  } catch (e) {
    if (shouldRethrowFromRsc(e)) {
      throw e;
    }

    const digest =
      e instanceof Error && "digest" in e
        ? String((e as Error & { digest?: unknown }).digest ?? "")
        : "";

    console.error("[marketplace/page]", e);

    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Compra/venta
        </h1>
        <p
          className="text-muted-foreground max-w-xl text-sm leading-relaxed"
          role="alert"
        >
          No pudimos renderizar esta página en el servidor. Si el problema
          continúa, revisa los logs del despliegue o vuelve más tarde.
        </p>
        {digest ? (
          <p
            className="text-muted-foreground bg-muted/30 max-w-xl rounded-xl border px-3 py-2 font-mono text-xs leading-relaxed break-all"
            role="status"
          >
            Digest: {digest}
          </p>
        ) : null}
      </div>
    );
  }
}
