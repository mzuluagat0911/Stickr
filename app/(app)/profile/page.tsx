import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProfilePage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "username, country_code, city, languages, album_edition, display_name",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="text-muted-foreground text-sm">
          No encontramos tu perfil. Completá el onboarding o contactá soporte.
        </p>
      </div>
    );
  }

  const languages = (profile.languages as string[] | null) ?? [];
  const langsLabel = languages.length > 0 ? languages.join(", ") : "—";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Datos de tu cuenta pública y preferencias de colección.
          </p>
        </div>
        <Button variant="outline" asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/profile/edit">Editar perfil</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {(profile.display_name as string | null)?.trim() ||
              (profile.username as string)}
          </CardTitle>
          <CardDescription>@{profile.username as string}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              País
            </p>
            <p className="mt-1 font-medium">
              {(profile.country_code as string) ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Ciudad
            </p>
            <p className="mt-1 font-medium">
              {(profile.city as string) ?? "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Idiomas
            </p>
            <p className="mt-1 font-medium">{langsLabel}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Edición del álbum
            </p>
            <p className="mt-1 font-medium">
              {(profile.album_edition as string) ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
