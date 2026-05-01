"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { completeOnboardingAction } from "@/app/actions/auth";
import type { ActionResult } from "@/lib/types/result";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  defaultUsername: string;
  defaultAlbumEdition: string;
};

export function OnboardingForm({
  defaultUsername,
  defaultAlbumEdition,
}: Props) {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    undefined as ActionResult | undefined,
  );

  useEffect(() => {
    if (state && !state.ok) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Completá tu perfil</CardTitle>
        <CardDescription>
          Estos datos ayudan a encontrar intercambios cerca tuyo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nombre de usuario</Label>
            <Input
              id="username"
              name="username"
              defaultValue={defaultUsername}
              autoComplete="username"
              required
            />
            <p className="text-muted-foreground text-xs">
              Solo letras, números y guión bajo. Podés cambiar el generado
              automáticamente.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="countryCode">País (ISO, 2 letras)</Label>
            <Input
              id="countryCode"
              name="countryCode"
              placeholder="AR"
              maxLength={2}
              autoComplete="country"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              name="city"
              autoComplete="address-level2"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="languages">Idiomas (coma)</Label>
            <Input
              id="languages"
              name="languages"
              placeholder="es, en"
              defaultValue="es"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="albumEdition">Edición del álbum</Label>
            <Input
              id="albumEdition"
              name="albumEdition"
              defaultValue={defaultAlbumEdition}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="geoOptIn"
              name="geoOptIn"
              value="true"
              className="size-4 rounded border"
            />
            <Label htmlFor="geoOptIn" className="font-normal">
              Permitir usar mi ubicación aproximada para el mapa (cuando esté
              disponible).
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Guardando…" : "Continuar al álbum"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
