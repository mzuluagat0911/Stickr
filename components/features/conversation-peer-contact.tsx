import { Mail, MessageCircle, Send } from "lucide-react";

import type { ConversationPeerContact } from "@/lib/profile/contact-links";
import {
  mailtoHref,
  telegramHref,
  whatsAppHref,
} from "@/lib/profile/contact-links";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ConversationPeerContactPanel({
  peerLabel,
  contact,
}: {
  peerLabel: string;
  contact: ConversationPeerContact | null;
}) {
  const wa =
    contact?.whatsapp != null && contact.whatsapp.trim() !== ""
      ? whatsAppHref(contact.whatsapp)
      : null;
  const tg =
    contact?.telegram != null && contact.telegram.trim() !== ""
      ? telegramHref(contact.telegram)
      : null;
  const mail =
    contact?.email != null && contact.email.trim() !== ""
      ? mailtoHref(contact.email)
      : null;

  const pref = contact?.preferred;

  if (!wa && !tg && !mail) {
    return (
      <Card className="border-border/70 bg-card/88 ring-border/35 dark:bg-card/82 rounded-2xl border border-dashed shadow-sm ring-1 backdrop-blur-md dark:ring-white/8">
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-foreground text-base font-semibold">
            Contacto externo
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm leading-relaxed">
            Cuando la otra persona muestre WhatsApp, Telegram o correo y la
            privacidad lo permita tras coordinar aquí, aparecerán enlaces para
            escribirle fuera de Stickr.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const btnClass = (channel: "whatsapp" | "telegram" | "email") =>
    cn(
      "rounded-xl",
      pref === channel &&
        "ring-primary/40 ring-2 ring-offset-2 ring-offset-background",
    );

  return (
    <Card className="border-border/70 bg-card/92 ring-border/40 dark:bg-card/88 rounded-2xl border shadow-md ring-1 backdrop-blur-md dark:ring-white/10">
      <CardHeader className="pt-5 pb-2">
        <CardTitle className="text-foreground text-base font-semibold">
          Contactar a {peerLabel}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm leading-relaxed">
          Canales que esta persona eligió mostrar según su privacidad. El trato
          sigue siendo entre ustedes fuera de Stickr.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        {wa ? (
          <Button
            variant="outline"
            size="sm"
            className={btnClass("whatsapp")}
            asChild
          >
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 size-4" aria-hidden />
              WhatsApp
            </a>
          </Button>
        ) : null}
        {tg ? (
          <Button
            variant="outline"
            size="sm"
            className={btnClass("telegram")}
            asChild
          >
            <a href={tg} target="_blank" rel="noopener noreferrer">
              <Send className="mr-2 size-4" aria-hidden />
              Telegram
            </a>
          </Button>
        ) : null}
        {mail ? (
          <Button
            variant="outline"
            size="sm"
            className={btnClass("email")}
            asChild
          >
            <a href={mail}>
              <Mail className="mr-2 size-4" aria-hidden />
              Correo
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
