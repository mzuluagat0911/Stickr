import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfileEditPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar perfil
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Esta pantalla será el formulario completo de edición en la Fase 3.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/profile">Volver</Link>
        </Button>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            Vas a poder actualizar nombre público, bio, foto, preferencias de
            intercambio y visibilidad en el mapa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Mientras tanto, algunos campos se pueden ajustar desde el flujo de
            onboarding o soporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
