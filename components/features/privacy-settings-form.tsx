"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updatePrivacySettingsAction } from "@/app/actions/profile";
import {
  privacySettingsSchema,
  type PrivacyFormInput,
} from "@/lib/validations/profile";
import type { PrivacySettings } from "@/lib/types/profile";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  initial: PrivacySettings | null;
};

const DEFAULT: PrivacySettings = {
  album_visibility: "registered",
  proposals_from: "anyone",
};

export function PrivacySettingsForm({ initial }: Props) {
  const [pending, start] = useTransition();
  const merged = {
    ...DEFAULT,
    ...initial,
    reputation_min: initial?.reputation_min,
  };

  const form = useForm<PrivacyFormInput>({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: {
      album_visibility: merged.album_visibility,
      proposals_from: merged.proposals_from,
      reputation_min: merged.reputation_min ?? 4,
    },
  });

  const proposalsFrom = form.watch("proposals_from");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((vals) => {
          start(async () => {
            const res = await updatePrivacySettingsAction(vals);
            if (res.ok) {
              toast.success(typeof res.data === "string" ? res.data : "Listo");
            } else {
              toast.error(res.message);
            }
          });
        })}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Álbum</CardTitle>
            <CardDescription>
              Quién puede ver tu progreso de colección.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="album_visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibilidad del álbum</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={pending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">Público (internet)</SelectItem>
                      <SelectItem value="registered">
                        Solo usuarios registrados
                      </SelectItem>
                      <SelectItem value="private">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Propuestas de intercambio</CardTitle>
            <CardDescription>
              Quién puede enviarte propuestas (sin chat en app: contacto externo
              después).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="proposals_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permitir propuestas desde</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={pending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="anyone">Cualquier persona</SelectItem>
                      <SelectItem value="reputation_min">
                        Solo con reputación mínima
                      </SelectItem>
                      <SelectItem value="friends_only">
                        Solo amigos (próximamente)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {proposalsFrom === "reputation_min" ? (
              <FormField
                control={form.control}
                name="reputation_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reputación mínima (estrellas 1–5)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        {...field}
                        value={
                          field.value === undefined || field.value === null
                            ? ""
                            : String(field.value)
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </CardContent>
        </Card>

        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar privacidad"}
        </Button>
      </form>
    </Form>
  );
}
