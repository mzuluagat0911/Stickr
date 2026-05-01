"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateLocationAction } from "@/app/actions/profile";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  cityLabel: string;
  initialStatus?: string | null;
  /** Sin Card externa (p. ej. onboarding paso 2). */
  embedded?: boolean;
};

export function GeolocationCapture({
  cityLabel,
  initialStatus,
  embedded = false,
}: Props) {
  const [status, setStatus] = useState(initialStatus ?? "");
  const [loading, setLoading] = useState(false);

  const updateLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Tu navegador no permite geolocalización.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await updateLocationAction(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        setLoading(false);
        if (res.ok) {
          const msg =
            typeof res.data === "string"
              ? res.data
              : "Ubicación aproximada guardada.";
          toast.success(msg);
          setStatus(
            `Precisión ~500 m (privacidad). Zona referida: ${cityLabel}.`,
          );
        } else {
          toast.error(res.message);
        }
      },
      (err) => {
        setLoading(false);
        toast.error(err.message || "No se pudo obtener la ubicación.");
      },
      {
        timeout: 10_000,
        enableHighAccuracy: false,
        maximumAge: 60_000,
      },
    );
  };

  const body = (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="default"
        className="inline-flex items-center justify-center gap-2 rounded-full"
        disabled={loading}
        onClick={updateLocation}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            Obteniendo ubicación…
          </>
        ) : (
          "Usar mi ubicación aproximada"
        )}
      </Button>
      <p className="text-muted-foreground text-xs">
        Referencia:{" "}
        <span className="text-foreground font-medium">{cityLabel}</span>
      </p>
      {status ? (
        <p className="text-muted-foreground text-sm">{status}</p>
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-2">
        <p className="text-foreground text-sm leading-snug font-medium">
          Activa el GPS solo si quieres mejorar mapa y descubrimiento cercano.
          En el servidor aplicamos desplazamiento de <strong>±500 m</strong>;
          las coordenadas exactas <strong>no</strong> se guardan.
        </p>
        {body}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ubicación aproximada</CardTitle>
        <CardDescription>
          Usamos tu posición solo para acercar resultados en mapa y
          descubrimiento. En servidor aplicamos{" "}
          <strong className="text-foreground">
            jitter aleatorio de ±500 m
          </strong>{" "}
          por eje; las coordenadas GPS reales{" "}
          <strong className="text-foreground">no se guardan nunca</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
