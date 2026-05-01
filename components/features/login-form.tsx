"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { signInWithEmailAction } from "@/app/actions/auth";
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
    <Card className="border-border/80 w-full shadow-lg shadow-black/5">
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Iniciar sesión
        </CardTitle>
        <CardDescription className="space-y-1 text-sm leading-relaxed">
          <span>Entra con correo para seguir donde lo dejaste.</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-4">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Correo
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@ejemplo.com"
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Contraseña
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="rounded-xl"
              required
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-base shadow-md"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm leading-relaxed">
          <Link
            href="/forgot-password"
            className="text-primary hover:text-primary/90 font-medium underline-offset-4 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
          <span className="text-muted-foreground/70 mx-1.5">·</span>
          <Link
            href="/signup"
            className="text-primary hover:text-primary/90 font-medium underline-offset-4 hover:underline"
          >
            Crear cuenta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
