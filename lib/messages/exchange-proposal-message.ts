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

/** Mensaje prellenado al abrir WhatsApp desde Intercambio. */
export function buildDiscoverWhatsAppPrefillMessage(input: {
  peerName: string;
  overlap: ExchangeOverlapDetail | null;
  overlapRpcFailed?: boolean;
}): string {
  const name = input.peerName.trim() || "coleccionista";

  if (input.overlapRpcFailed || !input.overlap || input.overlap.ok !== true) {
    return clampChars(
      `Hola ${name}, vengo de Stickr.\n\n` +
        `Quiero coordinar un intercambio de figuritas. Cuando puedas, contame qué repetidas tenés y qué te faltan; yo te paso lo mismo. ¡Gracias!`,
    );
  }

  const d = input.overlap;
  const theyHaveForMe = bulletLines(
    d.theirDuplicatesYouNeed,
    MAX_ITEMS_SECTION,
  );
  const iHaveForThem = bulletLines(d.yourDuplicatesTheyNeed, MAX_ITEMS_SECTION);

  const theyBlock =
    d.theirDuplicatesYouNeed.length > 0
      ? `Lo que vos tenés repetido y a mí me sirve (${d.counts.theirDuplicatesYouNeed} tipos):\n${theyHaveForMe}`
      : `Lo que me serviría de tus repetidas: por ahora Stickr no detecta cruces con tu álbum ${d.albumEdition}.`;

  const iBlock =
    d.yourDuplicatesTheyNeed.length > 0
      ? `Lo que yo tengo repetido y a vos te puede servir (${d.counts.yourDuplicatesTheyNeed} tipos):\n${iHaveForThem}`
      : `Lo que te podría servir de mis repetidas: por ahora no hay cruces automáticos en la app.`;

  return clampChars(
    `Hola ${name}, vengo de Stickr.\n\n${theyBlock}\n\n${iBlock}\n\n¿Te parece si lo coordinamos? ¡Gracias!`,
  );
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
