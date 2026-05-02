"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  confirmMarketDealCompletionAction,
  submitMarketDealReviewAction,
} from "@/app/actions/market-deal-completion";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export type MarketDealRow = {
  id: string;
  status: string;
  user_a_completed_at: string | null;
  user_b_completed_at: string | null;
  completed_at: string | null;
};

export type MyMarketReview = {
  id: string;
  rating: number;
  review_text: string | null;
} | null;

export function ConversationDealClosure({
  conversationId,
  currentUserId,
  userA,
  userB,
  deal,
  myReview,
}: {
  conversationId: string;
  currentUserId: string;
  userA: string;
  userB: string;
  deal: MarketDealRow | null;
  myReview: MyMarketReview;
}) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(5);
  const [pending, startTransition] = useTransition();

  const iAmA = currentUserId === userA;
  const myDone = iAmA
    ? Boolean(deal?.user_a_completed_at)
    : Boolean(deal?.user_b_completed_at);
  const peerDone = iAmA
    ? Boolean(deal?.user_b_completed_at)
    : Boolean(deal?.user_a_completed_at);
  const completed = deal?.status === "completed";

  const confirm = () => {
    startTransition(async () => {
      const res = await confirmMarketDealCompletionAction(conversationId);
      if (res.ok) {
        if (res.data?.bothComplete) {
          toast.success("Acuerdo completado: ambas partes confirmaron.");
        } else {
          toast.success("Confirmación guardada.");
        }
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <section className="border-border/60 bg-muted/10 space-y-4 rounded-2xl border p-4">
      <div className="space-y-1">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Cierre del acuerdo
        </h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Sin pagos dentro de Stickr: cada parte confirma cuando considera
          cumplido el trato (figuritas / pago acordado fuera de la app). Con las
          dos confirmaciones se incrementa el contador de intercambios en el
          perfil y podréis dejar reseña.
        </p>
      </div>

      {!deal ? (
        <p className="text-muted-foreground text-sm">
          Cargando estado del acuerdo… Si acabas de crear el hilo, recarga en un
          momento.
        </p>
      ) : completed ? (
        <div className="space-y-3">
          <p className="text-foreground text-sm font-medium">
            Acuerdo marcado como completado por ambas partes.
          </p>
          {myReview ? (
            <p className="text-muted-foreground text-sm">
              Ya dejaste una reseña ({myReview.rating}/5).
            </p>
          ) : (
            <form
              className="bg-background/60 space-y-3 rounded-xl border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("rating", String(rating));
                startTransition(async () => {
                  const res = await submitMarketDealReviewAction(
                    conversationId,
                    fd,
                  );
                  if (res.ok) {
                    toast.success("Gracias por tu reseña");
                    router.refresh();
                  } else {
                    toast.error(res.message);
                  }
                });
              }}
            >
              <div className="space-y-2">
                <Label>Valoración (1–5)</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={rating === n ? "default" : "outline"}
                      className="min-w-9 rounded-lg px-0"
                      disabled={pending}
                      onClick={() => setRating(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="review-text">Comentario (opcional)</Label>
                <Textarea
                  id="review-text"
                  name="reviewText"
                  rows={3}
                  maxLength={280}
                  disabled={pending}
                  placeholder="Breve experiencia con la contraparte…"
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  "Publicar reseña"
                )}
              </Button>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-muted-foreground space-y-1 text-sm">
            <p>
              Tu confirmación:{" "}
              <span className="text-foreground font-medium">
                {myDone ? "Lista" : "Pendiente"}
              </span>
            </p>
            <p>
              La otra parte:{" "}
              <span className="text-foreground font-medium">
                {peerDone ? "Lista" : "Pendiente"}
              </span>
            </p>
          </div>
          {!myDone ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={confirm}
              className="rounded-xl"
            >
              {pending ? (
                <>
                  <Loader2
                    className="mr-2 size-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                  Guardando…
                </>
              ) : (
                "Confirmo que el trato quedó cumplido"
              )}
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">
              Esperando confirmación de la otra parte…
            </p>
          )}
        </div>
      )}
    </section>
  );
}
