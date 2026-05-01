"use client";

import { useState } from "react";
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
};

export function GeolocationCapture({ cityLabel, initialStatus }: Props) {
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
      <CardContent className="flex flex-col gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={updateLocation}
        >
          {loading ? "Obteniendo ubicación…" : "Actualizar mi ubicación"}
        </Button>
        {status ? (
          <p className="text-muted-foreground text-sm">{status}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
