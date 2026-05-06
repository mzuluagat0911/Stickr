import {
  Album,
  ArrowLeftRight,
  Handshake,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";

/**
 * Panel contextual solo para hilos de intercambio (sin publicación de marketplace).
 */
export function ConversationExchangeGuide({
  peerUsername,
}: {
  peerUsername: string;
}) {
  const peerHandle =
    peerUsername.trim() !== "" ? `@${peerUsername.trim()}` : "tu contacto";

  return (
    <section
      className="border-border/70 bg-card/92 ring-border/40 dark:bg-card/88 space-y-4 rounded-2xl border px-4 py-5 shadow-md ring-1 backdrop-blur-md sm:px-6 dark:ring-white/10"
      aria-labelledby="exchange-guide-heading"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="bg-primary/14 text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-inner">
          <Handshake className="size-[1.35rem]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h2
            id="exchange-guide-heading"
            className="font-heading text-foreground text-base leading-snug font-semibold tracking-tight sm:text-lg"
          >
            Coordinar intercambio con {peerHandle}
          </h2>
          <p className="text-muted-foreground text-sm leading-snug">
            Tips rápidos para coordinar sin confusiones.
          </p>
        </div>
      </div>
      <ul className="text-foreground/92 space-y-4 text-sm leading-relaxed">
        <li className="flex gap-3">
          <Album
            className="text-primary mt-0.5 size-[1.125rem] shrink-0 opacity-95"
            aria-hidden
          />
          <span>
            Convén números de figurita claros (por ejemplo «¿Tenés la PR-INT-142
            repetida?»). Abrí el álbum en paralelo para no confundir edición.
          </span>
        </li>
        <li className="flex gap-3">
          <ArrowLeftRight
            className="text-primary mt-0.5 size-[1.125rem] shrink-0 opacity-95"
            aria-hidden
          />
          <span>
            Acordá lugar y hora si es cara a cara. El trato y cualquier pago son
            fuera de Stickr.
          </span>
        </li>
        <li className="flex gap-3">
          <ShieldAlert
            className="mt-0.5 size-[1.125rem] shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <span>
            WhatsApp, Telegram o correo aparecen en «Contactar» cuando la otra
            persona los muestra según privacidad y ya hay coordinación en el
            chat.
          </span>
        </li>
      </ul>
      <div className="border-primary/20 bg-primary/[0.07] flex gap-3 rounded-xl border px-3 py-3 sm:px-4">
        <Lightbulb
          className="text-primary mt-0.5 size-[1.125rem] shrink-0"
          aria-hidden
        />
        <p className="text-foreground/95 text-sm leading-relaxed">
          Desde Intercambio en descubrir, «Proponer intercambio» puede enviar un
          primer mensaje con listas sugeridas; la otra persona verá la solicitud
          en Mensajes (y podés activar aviso por correo con un webhook en
          Supabase).
        </p>
      </div>
    </section>
  );
}
