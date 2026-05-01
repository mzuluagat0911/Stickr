"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { signInWithEmailAction } from "@/app/actions/auth";
import type { ActionResult } from "@/lib/types/result";

import { OAuthProviderButton } from "@/components/features/oauth-provider-button";
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

const init: ActionResult | undefined = undefined;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    signInWithEmailAction,
    init,
  );

  useEffect(() => {
    if (state && !state.ok) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Entrá con correo o una cuenta social.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card text-muted-foreground px-2">
              O continuar con
            </span>
          </div>
        </div>

        <OAuthProviderButton
          provider="google"
          label="Google"
          disabled={pending}
        />
        <OAuthProviderButton
          provider="apple"
          label="Apple"
          disabled={pending}
        />

        <p className="text-muted-foreground text-center text-sm">
          <Link href="/forgot-password" className="underline">
            ¿Olvidaste tu contraseña?
          </Link>
          {" · "}
          <Link href="/signup" className="underline">
            Crear cuenta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
