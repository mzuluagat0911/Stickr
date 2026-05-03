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
    <Card className="w-full border-zinc-200/70 bg-zinc-50/70 shadow-none ring-1 ring-zinc-200/60 dark:border-zinc-700/60 dark:bg-zinc-900/40 dark:ring-zinc-700/50">
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
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#ff8200] text-base font-semibold text-white shadow-md hover:bg-[#e67300] active:bg-[#cc6600] disabled:opacity-60 dark:bg-[#ff8200] dark:hover:bg-[#e67300]"
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
            className="font-medium text-[#2b59c3] underline-offset-4 hover:text-[#1e4199] hover:underline dark:text-[#6b93ff]"
          >
            ¿Olvidaste tu contraseña?
          </Link>
          <span className="text-muted-foreground/70 mx-1.5">·</span>
          <Link
            href="/signup"
            className="font-medium text-[#2b59c3] underline-offset-4 hover:text-[#1e4199] hover:underline dark:text-[#6b93ff]"
          >
            Crear cuenta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
