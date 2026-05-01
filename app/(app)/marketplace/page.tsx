import { redirect } from "next/navigation";

import { ALBUM_EDITION_OPTIONS } from "@/lib/constants/profile";
import { defaultMarketCurrency } from "@/lib/marketplace/currency";
import { getMarketFeed } from "@/lib/marketplace/feed";
import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";

import { MarketplacePanel } from "@/components/features/marketplace-panel";

export default async function MarketplacePage() {
  if (!hasPublicSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  let edition = "PR-International";
  let defaultCurrency = defaultMarketCurrency(null);
  let editionLabel = "PR-International";
  let feed: Awaited<ReturnType<typeof getMarketFeed>> = {
    ok: false,
    message: "No pudimos cargar el marketplace en este momento.",
  };

  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("album_edition, country_code")
      .eq("id", user.id)
      .maybeSingle();

    edition =
      typeof profile?.album_edition === "string"
        ? profile.album_edition
        : "PR-International";
    defaultCurrency = defaultMarketCurrency(profile?.country_code ?? null);
    editionLabel =
      ALBUM_EDITION_OPTIONS.find((o) => o.value === edition)?.label ?? edition;

    feed = await getMarketFeed();
  } catch (e) {
    feed = {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : "No pudimos cargar el marketplace en este momento.",
    };
  }

  return (
    <div className="space-y-8 md:space-y-10">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl md:tracking-tighter">
          Compra/venta
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed md:text-[0.9375rem] md:leading-snug">
          Tus publicaciones usan tu edición de álbum declarada ({editionLabel}):
          el número de figurita debe existir en ese catálogo. Moneda en ARS,
          USD, COP o EUR — al comprar/vender sugerimos una según tu país en el
          perfil.
        </p>
      </header>
      <MarketplacePanel
        editionLabel={editionLabel}
        defaultCurrency={defaultCurrency}
        intents={feed.ok ? feed.intents : []}
        feedError={feed.ok ? null : feed.message}
        currentUserId={user.id}
      />
    </div>
  );
}
