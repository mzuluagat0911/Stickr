import type {
  ExchangeOverlapDetail,
  ExchangeOverlapStickerRow,
} from "@/lib/discover/exchange-overlap-detail";
import { formatOverlapStickerLine } from "@/lib/discover/exchange-overlap-detail";

const MAX_ITEMS_SECTION = 45;
const MAX_CHARS_SOFT = 1950;

function bulletLines(rows: ExchangeOverlapStickerRow[], max: number): string {
  const slice = rows.slice(0, max);
  const lines = slice.map((r) => `• ${formatOverlapStickerLine(r)}`);
  const extra = rows.length - slice.length;
  if (extra > 0) {
    lines.push(
      `• … y ${extra} más (abrí «Figuritas y cruces» en Intercambio para ver el detalle).`,
    );
  }
  return lines.join("\n");
}

function clampChars(body: string): string {
  if (body.length <= MAX_CHARS_SOFT) return body;
  return `${body.slice(0, MAX_CHARS_SOFT - 40)}\n\n… (mensaje acortado: revisá la lista completa en Stickr › Intercambio.)`;
}

/**
 * Mensaje inicial al pulsar «Proponer intercambio» (solo primer mensaje del hilo).
 */
export function buildDiscoverExchangeProposalMessage(input: {
  selfLabel: string;
  peerAtUsername: string;
  overlap: ExchangeOverlapDetail | null;
  overlapRpcFailed?: boolean;
}): string {
  const peer = input.peerAtUsername.startsWith("@")
    ? input.peerAtUsername
    : `@${input.peerAtUsername}`;
  const me = input.selfLabel.trim() || "Un coleccionista";

  if (input.overlapRpcFailed || !input.overlap || input.overlap.ok !== true) {
    let note = "";
    if (input.overlap && input.overlap.ok === false) {
      if (input.overlap.reason === "edition_mismatch") {
        note = `\n\n(En Stickr figuramos ediciones distintas de álbum —vos: ${input.overlap.yourEdition ?? "—"}, ellos: ${input.overlap.theirEdition ?? "—"}— igual podemos coordinar manualmente.)`;
      }
    }
    const base =
      `Hola ${peer}, soy ${me}. Te escribo desde Intercambio en Stickr para ver si podemos intercambiar figuritas.${note}\n\n` +
      `Cuando puedas, decime qué repetidas tenés y qué te faltaría; yo hago lo mismo. ¡Gracias!`;
    return clampChars(base);
  }

  const d = input.overlap;
  const give = bulletLines(d.yourDuplicatesTheyNeed, MAX_ITEMS_SECTION);
  const take = bulletLines(d.theirDuplicatesYouNeed, MAX_ITEMS_SECTION);

  const giveHead =
    d.yourDuplicatesTheyNeed.length > 0
      ? `Figuritas repetidas mías que te podrían servir (${d.counts.yourDuplicatesTheyNeed} tipos en catálogo):\n${give}`
      : `Por ahora no detectamos en Stickr repetidas tuyas que a esta persona le falten con la misma edición de álbum (podés ofrecer otras por texto).`;

  const takeHead =
    d.theirDuplicatesYouNeed.length > 0
      ? `Figuritas que busco yo y vos tenés repetidas (${d.counts.theirDuplicatesYouNeed} tipos):\n${take}`
      : `Figuritas que me servirían de tus repetidas: por ahora no hay cruces automáticos en la app; coordinemos por mensaje.`;

  const body =
    `Hola ${peer}, soy ${me}. Te propongo intercambio desde Stickr (álbum ${d.albumEdition}).\n\n` +
    `${giveHead}\n\n` +
    `${takeHead}\n\n` +
    `¿Te parece si lo afinamos acá y después coordinamos día/lugar o WhatsApp cuando quieras?`;

  return clampChars(body);
}

/** Texto sugerido para pegar en WhatsApp tras la propuesta en Stickr. */
export function buildExchangeWhatsAppCoordinatorBody(input: {
  peerFirstNameOrUsername: string;
  selfFirstName: string;
}): string {
  const peer = input.peerFirstNameOrUsername.trim() || "hola";
  const me = input.selfFirstName.trim() || "";
  const intro = me ? `Soy ${me}. ` : "";
  return (
    `${intro}Te escribo por el intercambio de figuritas que te mandé por Stickr. ` +
    `¿Te viene bien que coordinemos día y hora (o lugar) para encontrarnos?`
  ).trim();
}
