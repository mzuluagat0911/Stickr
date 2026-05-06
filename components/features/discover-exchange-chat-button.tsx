"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { openDiscoverExchangeProposalAction } from "@/app/actions/messages";

import { Button } from "@/components/ui/button";

export function DiscoverExchangeChatButton({
  otherUserId,
  username,
}: {
  otherUserId: string;
  username: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const openChat = () => {
    startTransition(async () => {
      const res = await openDiscoverExchangeProposalAction(
        otherUserId,
        username,
      );
      if (res.ok && res.data?.conversationId) {
        if (res.data.proposalSent) {
          toast.success(
            "Propuesta enviada en el chat con listas sugeridas. Coordiná el detalle ahí o por WhatsApp.",
          );
        } else {
          toast.success(
            "Ya tenían mensajes en este chat; abrilo para seguir la conversación.",
          );
        }
        router.push(`/messages/${res.data.conversationId}`);
      } else if (!res.ok) {
        toast.error(res.message);
      }
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      className="max-w-full min-w-0 rounded-xl text-sm font-medium sm:w-auto"
      disabled={pending}
      aria-busy={pending}
      aria-label={
        pending
          ? "Abriendo chat de intercambio"
          : `Proponer intercambio con ${username}`
      }
      onClick={openChat}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 shrink-0 animate-spin" aria-hidden />
          <span className="min-w-0 truncate">Abriendo chat…</span>
        </>
      ) : (
        <>
          <MessageSquare className="mr-2 size-4 shrink-0" aria-hidden />
          <span className="min-w-0 truncate sm:max-w-none">
            <span className="sm:hidden">Chat con @{username}</span>
            <span className="hidden sm:inline">
              Proponer intercambio con @{username}
            </span>
          </span>
        </>
      )}
    </Button>
  );
}
