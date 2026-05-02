import { Album, ArrowLeftRight, Handshake, ShieldAlert } from "lucide-react";

/**
 * Panel contextual solo para hilos de intercambio (sin publicación de marketplace).
 */
export function ConversationExchangeGuide({
  peerUsername,
}: {
  peerUsername: string;
}) {
  return (
    <section
      className="border-primary/15 bg-primary/[0.04] space-y-3 rounded-2xl border px-4 py-4 sm:px-5"
      aria-labelledby="exchange-guide-heading"
    >
      <div className="flex items-center gap-2">
        <span className="bg-primary/12 text-primary flex size-9 items-center justify-center rounded-xl">
          <Handshake className="size-4" aria-hidden />
        </span>
        <h2
          id="exchange-guide-heading"
          className="font-heading text-sm font-semibold tracking-tight sm:text-base"
        >
          Coordinar intercambio con @{peerUsername}
        </h2>
      </div>
      <ul className="text-muted-foreground space-y-2.5 text-xs leading-relaxed sm:text-sm">
        <li className="flex gap-2.5">
          <Album
            className="text-primary mt-0.5 size-4 shrink-0 opacity-90"
            aria-hidden
          />
          <span>
            Convén números de figurita claros (ej. «¿Tenés la PR-INT-142
            repetida?»). Mirá el álbum en paralelo para no confundir edición.
          </span>
        </li>
        <li className="flex gap-2.5">
          <ArrowLeftRight
            className="text-primary mt-0.5 size-4 shrink-0 opacity-90"
            aria-hidden
          />
          <span>
            Acordá lugar y hora si es cara a cara; el trato y cualquier pago son
            fuera de Stickr.
          </span>
        </li>
        <li className="flex gap-2.5">
          <ShieldAlert
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <span>
            Si la otra persona compartió WhatsApp u otro canal en su perfil,
            podés usarlo cuando ambos estén de acuerdo.
          </span>
        </li>
      </ul>
    </section>
  );
}
