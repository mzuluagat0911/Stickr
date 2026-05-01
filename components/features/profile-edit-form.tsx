"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateProfileAction, uploadAvatarAction } from "@/app/actions/profile";
import {
  ALBUM_EDITION_OPTIONS,
  PROFILE_LANGUAGE_OPTIONS,
  VISIBILITY_LABELS,
} from "@/lib/constants/profile";
import { countryFlagEmoji } from "@/lib/data/countries";
import {
  profileFormSchema,
  type ProfileFormInput,
  type ProfileUpdateInput,
} from "@/lib/validations/profile";

import { CountryPicker } from "@/components/features/country-picker";
import { GeolocationCapture } from "@/components/features/geolocation-capture";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const VIS_OPTIONS = ["post_trade", "always", "never"] as const;

type Props = {
  defaultValues: ProfileFormInput;
  cityLabel: string;
  avatarUrl: string | null;
};

export function ProfileEditForm({
  defaultValues,
  cityLabel,
  avatarUrl,
}: Props) {
  const [pending, start] = useTransition();

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });

  const bioLen = form.watch("bio")?.length ?? 0;

  const onSubmit = (data: ProfileUpdateInput) => {
    start(async () => {
      const res = await updateProfileAction(data);
      if (res.ok) {
        toast.success(typeof res.data === "string" ? res.data : "Guardado");
      } else {
        toast.error(res.message);
      }
    });
  };

  const countryForBadge = form.watch("countryCode");

  const flag = useMemo(
    () => countryFlagEmoji(countryForBadge || "XX"),
    [countryForBadge],
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((vals) => {
            const p = profileFormSchema.safeParse(vals);
            if (!p.success) {
              toast.error(p.error.issues[0]?.message ?? "Revisá el formulario");
              return;
            }
            onSubmit(p.data);
          })}
          className="space-y-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Foto de perfil</CardTitle>
              <CardDescription>
                Subí una imagen JPG, PNG o WebP (máx. 2 MB). Se guarda en
                Supabase Storage (bucket «avatars»).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <AvatarUploadSection initialUrl={avatarUrl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos públicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre público</FormLabel>
                    <FormControl>
                      <Input
                        id="displayName"
                        placeholder="Cómo te ven otros"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio ({bioLen}/200)</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-24 resize-y" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="countryCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <CountryPicker
                          label="País"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={pending}
                        />
                      </FormControl>
                      <p className="text-muted-foreground text-xs">
                        {flag} Código ISO del perfil.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="address-level2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="albumEdition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edición del álbum</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={pending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegí edición" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ALBUM_EDITION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="languages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idiomas</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {PROFILE_LANGUAGE_OPTIONS.map((opt) => {
                        const on = field.value?.includes(opt.code) ?? false;
                        return (
                          <Button
                            key={opt.code}
                            type="button"
                            variant={on ? "default" : "outline"}
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              const cur = new Set(field.value ?? []);
                              if (on) {
                                if (cur.size <= 1) return;
                                cur.delete(opt.code);
                              } else {
                                cur.add(opt.code);
                              }
                              field.onChange([...cur]);
                            }}
                            disabled={pending}
                          >
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferencias de intercambio</CardTitle>
              <CardDescription>
                Coordinación fuera de la app según cómo querés operar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="tradePreferences.inPerson"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-1">
                      <FormLabel>Encuentro en persona</FormLabel>
                      <p className="text-muted-foreground text-xs">
                        Intercambio presencial
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={pending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tradePreferences.nationalShipping"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
                    <FormLabel>Envío nacional</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={pending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tradePreferences.internationalShipping"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
                    <FormLabel>Envío internacional</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={pending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métodos de contacto</CardTitle>
              <CardDescription>
                Tras acordar un intercambio, el contacto es externo (WhatsApp,
                Telegram o correo).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="preferred"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal preferido</FormLabel>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) =>
                        field.onChange(
                          v === "__none__"
                            ? undefined
                            : (v as NonNullable<ProfileFormInput["preferred"]>),
                        )
                      }
                      disabled={pending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Sin preferencia
                        </SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="email">Correo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-lg border p-4">
                <Label>WhatsApp</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="whatsappCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <CountryPicker
                            label="País del número"
                            value={
                              field.value ??
                              form.getValues("countryCode") ??
                              "AR"
                            }
                            onChange={field.onChange}
                            disabled={pending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatsappNational"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>
                          Número (sin prefijo internacional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="11 1234 5678"
                            autoComplete="tel-national"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="whatsappVisibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibilidad WhatsApp</FormLabel>
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
                          {VIS_OPTIONS.map((v) => (
                            <SelectItem key={v} value={v}>
                              {VISIBILITY_LABELS[v]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <FormField
                  control={form.control}
                  name="telegramUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="usuario (sin @)"
                          autoComplete="username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telegramVisibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibilidad Telegram</FormLabel>
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
                          {VIS_OPTIONS.map((v) => (
                            <SelectItem key={v} value={v}>
                              {VISIBILITY_LABELS[v]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <FormField
                  control={form.control}
                  name="emailPublic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo público</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emailVisibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibilidad correo</FormLabel>
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
                          {VIS_OPTIONS.map((v) => (
                            <SelectItem key={v} value={v}>
                              {VISIBILITY_LABELS[v]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <GeolocationCapture cityLabel={cityLabel} />

          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

function AvatarUploadSection({ initialUrl }: { initialUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);

  return (
    <>
      <div className="bg-muted flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-muted-foreground text-xs">Sin foto</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="avatar-upload">Archivo</Label>
        <Input
          id="avatar-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          className="cursor-pointer"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            void (async () => {
              setUploading(true);
              const fd = new FormData();
              fd.set("avatar", f);
              const res = await uploadAvatarAction(fd);
              setUploading(false);
              if (res.ok && res.data?.url) {
                setPreview(res.data.url);
                toast.success("Foto actualizada");
              } else if (!res.ok) {
                toast.error(res.message);
              }
            })();
          }}
        />
      </div>
    </>
  );
}
