"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { openDirectConversationAction } from "@/app/actions/messages";

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
      const res = await openDirectConversationAction(otherUserId);
      if (res.ok && res.data?.conversationId) {
        toast.success("Chat listo: coordina qué figuras cambiarían.");
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
      className="w-full rounded-xl text-sm font-medium sm:w-auto"
      disabled={pending}
      onClick={openChat}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 shrink-0 animate-spin" aria-hidden />
          Abriendo chat…
        </>
      ) : (
        <>
          <MessageSquare className="mr-2 size-4 shrink-0" aria-hidden />
          Proponer intercambio con @{username}
        </>
      )}
    </Button>
  );
}
