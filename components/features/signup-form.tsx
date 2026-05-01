"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { signUpAction } from "@/app/actions/auth";
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

const init: ActionResult<string> | undefined = undefined;

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, init);

  useEffect(() => {
    if (!state) return;
    if (state.ok && typeof state.data === "string") {
      toast.success(state.data);
    }
    if (!state.ok) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Card className="border-border/80 w-full shadow-lg shadow-black/5">
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Crear cuenta
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Regístrate con correo en un minuto y sigue el onboarding.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-4">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Nombre
            </Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Cómo te llamas públicamente"
              className="rounded-xl"
              required
            />
          </div>
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
              autoComplete="new-password"
              className="rounded-xl"
              required
              minLength={8}
            />
            <p className="text-muted-foreground text-xs">
              Mínimo 8 caracteres.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">
              Confirmar contraseña
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
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
                Creando…
              </>
            ) : (
              "Registrarme"
            )}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary/90 font-medium underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
