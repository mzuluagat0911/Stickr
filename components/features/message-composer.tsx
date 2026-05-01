"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { sendMessageAction } from "@/app/actions/messages";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="border-border/60 bg-background/80 space-y-3 rounded-2xl border p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const body = text.trim();
        if (!body || pending) return;
        startTransition(async () => {
          const res = await sendMessageAction(conversationId, body);
          if (res.ok) {
            setText("");
            toast.success("Mensaje enviado");
            router.refresh();
          } else {
            toast.error(res.message);
          }
        });
      }}
    >
      <Textarea
        name="content"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe tu mensaje…"
        rows={3}
        maxLength={2000}
        disabled={pending}
        className="min-h-[5.5rem] resize-y rounded-xl"
        aria-label="Mensaje"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !text.trim()}>
          {pending ? (
            <>
              <Loader2
                className="mr-2 size-4 shrink-0 animate-spin"
                aria-hidden
              />
              Enviando…
            </>
          ) : (
            "Enviar"
          )}
        </Button>
      </div>
    </form>
  );
}
