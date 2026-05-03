"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/browser";
import { resetPasswordSchema } from "@/lib/validations/auth";
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

export function ResetPasswordForm() {
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      password: fd.get("password"),
      confirmPassword: fd.get("confirmPassword"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada. Ya puedes iniciar sesión.");
    window.location.href = "/login";
  }

  return (
    <Card className="w-full border-zinc-200/70 bg-zinc-50/70 shadow-none ring-1 ring-zinc-200/60 dark:border-zinc-700/60 dark:bg-zinc-900/40 dark:ring-zinc-700/50">
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Nueva contraseña
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Elige una contraseña segura para volver a entrar con correo y clave.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Nueva contraseña
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">
              Confirmar
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
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#ff8200] text-base font-semibold text-white shadow-md hover:bg-[#e67300] active:bg-[#cc6600] disabled:opacity-60 dark:bg-[#ff8200] dark:hover:bg-[#e67300]"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Guardando…
              </>
            ) : (
              "Guardar"
            )}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            <Link
              href="/login"
              className="font-medium text-[#2b59c3] underline-offset-4 hover:text-[#1e4199] hover:underline dark:text-[#6b93ff]"
            >
              Ir al inicio de sesión
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
