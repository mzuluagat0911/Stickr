"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { requestPasswordResetAction } from "@/app/actions/auth";
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

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    undefined as ActionResult<string> | undefined,
  );

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
    <Card>
      <CardHeader>
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>
          Te enviamos un enlace si el correo está registrado.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Enviando…" : "Enviar enlace"}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            <Link href="/login" className="underline">
              Volver al inicio de sesión
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
