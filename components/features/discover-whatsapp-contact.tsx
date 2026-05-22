"use client";

import { Loader2, MessageCircle } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { getExchangeOverlapDetailAction } from "@/app/actions/exchange-overlap";
import { DiscoverExchangeChatButton } from "@/components/features/discover-exchange-chat-button";
import { formatWhatsAppDisplay } from "@/lib/discover/format-whatsapp";
import type { DiscoverPeerContactInfo } from "@/lib/discover/peer-contact-types";
import { buildDiscoverWhatsAppPrefillMessage } from "@/lib/messages/exchange-proposal-message";
import { whatsAppHref } from "@/lib/profile/contact-links";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DiscoverWhatsAppContact({
  otherUserId,
  username,
  peerDisplayName,
  contact,
  showChatWhenLocked = true,
  className,
}: {
  otherUserId: string;
  username: string;
  peerDisplayName: string;
  contact: Pick<DiscoverPeerContactInfo, "whatsappE164" | "whatsappLocked">;
  showChatWhenLocked?: boolean;
  className?: string;
}) {
  const wa = contact.whatsappE164?.trim() ?? "";
  const [pending, startTransition] = useTransition();

  const openWhatsApp = () => {
    if (!wa) return;
    startTransition(async () => {
      const res = await getExchangeOverlapDetailAction(otherUserId);
      const message = buildDiscoverWhatsAppPrefillMessage({
        peerName: peerDisplayName,
        overlap: res.ok && res.data ? res.data : null,
        overlapRpcFailed: !res.ok,
      });
      const href = whatsAppHref(wa, message);
      if (!href) {
        toast.error("Número de WhatsApp no válido.");
        return;
      }
      window.open(href, "_blank", "noopener,noreferrer");
    });
  };

  if (wa) {
    const label = formatWhatsAppDisplay(wa);
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        aria-busy={pending}
        className={cn(
          "w-full shrink-0 rounded-xl border-emerald-600/35 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 sm:w-auto dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-50 dark:hover:bg-emerald-950/80",
          className,
        )}
        aria-label={
          pending
            ? `Preparando mensaje para ${peerDisplayName}`
            : `WhatsApp de ${peerDisplayName}: ${label}`
        }
        onClick={openWhatsApp}
      >
        {pending ? (
          <>
            <Loader2
              className="mr-2 size-4 shrink-0 animate-spin"
              aria-hidden
            />
            <span className="min-w-0 truncate">Preparando mensaje…</span>
          </>
        ) : (
          <>
            <MessageCircle className="mr-2 size-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">
              WhatsApp · <span className="tabular-nums">{label}</span>
            </span>
          </>
        )}
      </Button>
    );
  }

  if (contact.whatsappLocked) {
    return (
      <div
        className={cn(
          "text-muted-foreground w-full space-y-2 text-[11px] leading-snug sm:max-w-[14rem]",
          className,
        )}
      >
        <p>Tiene WhatsApp; el número aparece al coordinar en el chat.</p>
        {showChatWhenLocked ? (
          <DiscoverExchangeChatButton
            otherUserId={otherUserId}
            username={username}
          />
        ) : null}
      </div>
    );
  }

  return null;
}
