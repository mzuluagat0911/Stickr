"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

import { sendMessageAction } from "@/app/actions/messages";
import { buildExchangeWhatsAppCoordinatorBody } from "@/lib/messages/exchange-proposal-message";
import { whatsAppHref } from "@/lib/profile/contact-links";

import { Button } from "@/components/ui/button";

const MSG_INTERESTED =
  "¡Hola! Me interesa tu propuesta de intercambio en Stickr. ¿Seguimos por acá para afinar figuritas y día o lugar?";

const MSG_LATER =
  "Gracias por tu mensaje en Stickr. Ahora no puedo pero en estos días te escribo para coordinar el intercambio.";

export function ConversationExchangeJourneyBar({
  conversationId,
  peerUsername,
  selfDisplayName,
  peerWhatsappE164,
}: {
  conversationId: string;
  /** Sin @ */
  peerUsername: string;
  selfDisplayName: string;
  peerWhatsappE164?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const waLink = peerWhatsappE164
    ? (() => {
        const base = whatsAppHref(peerWhatsappE164);
        if (!base) return null;
        const text = buildExchangeWhatsAppCoordinatorBody({
          peerFirstNameOrUsername: peerUsername || "hola",
          selfFirstName: selfDisplayName,
        });
        return `${base}?text=${encodeURIComponent(text)}`;
      })()
    : null;

  const copyWaTemplate = () => {
    const text = buildExchangeWhatsAppCoordinatorBody({
      peerFirstNameOrUsername: peerUsername || "hola",
      selfFirstName: selfDisplayName,
    });
    void navigator.clipboard.writeText(text).then(
      () => toast.success("Plantilla copiada; pegala en WhatsApp."),
      () => toast.error("No se pudo copiar."),
    );
  };

  const sendCanned = (body: string) => {
    startTransition(async () => {
      const res = await sendMessageAction(conversationId, body);
      if (res.ok) {
        toast.success("Mensaje enviado");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <section
      className="border-border/70 bg-card/92 ring-border/40 dark:bg-card/88 space-y-4 rounded-2xl border px-4 py-5 shadow-md ring-1 backdrop-blur-md dark:ring-white/10"
      aria-label="Respuestas rápidas de intercambio"
    >
      <div>
        <p className="text-foreground text-sm font-medium">Siguiente paso</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          No hay aprobación formal en la app: respondé aquí o pasá a WhatsApp
          cuando ambos quieran coordinar.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="rounded-xl text-xs"
          disabled={pending}
          onClick={() => sendCanned(MSG_INTERESTED)}
        >
          {pending ? (
            <Loader2 className="mr-1 size-3.5 animate-spin" aria-hidden />
          ) : (
            <MessageCircle className="mr-1 size-3.5" aria-hidden />
          )}
          Me interesa
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl text-xs"
          disabled={pending}
          onClick={() => sendCanned(MSG_LATER)}
        >
          Ahora no, después
        </Button>
      </div>
      <div className="border-border/60 flex flex-wrap gap-2 border-t pt-4">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl text-xs"
          onClick={copyWaTemplate}
        >
          <Copy className="mr-1 size-3.5" aria-hidden />
          Copiar texto WhatsApp
        </Button>
        {waLink ? (
          <Button
            type="button"
            size="sm"
            className="rounded-xl text-xs"
            asChild
          >
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              Abrir WhatsApp con texto
            </a>
          </Button>
        ) : (
          <p className="text-muted-foreground flex min-w-[12rem] flex-1 items-center text-xs leading-snug">
            WhatsApp aparece cuando la otra persona lo muestra según privacidad
            y ya hay coordinación en el chat.
          </p>
        )}
      </div>
    </section>
  );
}
