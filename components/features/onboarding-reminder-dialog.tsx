"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OnboardingReminderDialogProps = {
  mustCompleteOnboarding: boolean;
};

export function OnboardingReminderDialog({
  mustCompleteOnboarding,
}: OnboardingReminderDialogProps) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  const shouldRender = useMemo(() => {
    if (!mustCompleteOnboarding || dismissed) return false;
    if (!pathname) return true;
    // Evita molestar dentro del flujo donde justamente completa los datos.
    if (pathname.startsWith("/onboarding")) return false;
    if (pathname.startsWith("/profile/edit")) return false;
    return true;
  }, [dismissed, mustCompleteOnboarding, pathname]);

  return (
    <Dialog open={shouldRender} onOpenChange={(open) => setDismissed(!open)}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Te falta completar tu perfil</DialogTitle>
          <DialogDescription>
            Para aparecer en Intercambio debes terminar el onboarding y guardar
            ciudad y pais. Sin eso, otros coleccionistas no te pueden ver.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDismissed(true)}>
            Luego
          </Button>
          <Button asChild>
            <Link href="/onboarding">Completar ahora</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
