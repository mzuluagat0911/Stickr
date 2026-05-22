import { describe, expect, it } from "vitest";

import { buildDiscoverWhatsAppPrefillMessage } from "@/lib/messages/exchange-proposal-message";

describe("buildDiscoverWhatsAppPrefillMessage", () => {
  it("saluda con nombre y Stickr", () => {
    const msg = buildDiscoverWhatsAppPrefillMessage({
      peerName: "Mateo",
      overlap: null,
      overlapRpcFailed: true,
    });
    expect(msg).toContain("Hola Mateo, vengo de Stickr");
  });

  it("incluye listas de cruces", () => {
    const msg = buildDiscoverWhatsAppPrefillMessage({
      peerName: "Ana",
      overlap: {
        ok: true,
        albumEdition: "PR-International",
        theirDuplicatesYouNeed: [
          {
            stickerId: "a",
            stickerNumber: 10,
            teamCode: "ARG",
            tradableQty: 1,
            playerName: "Messi",
          },
        ],
        yourDuplicatesTheyNeed: [
          {
            stickerId: "b",
            stickerNumber: 20,
            teamCode: "BRA",
            tradableQty: 2,
            playerName: null,
          },
        ],
        theirDuplicatesAll: [],
        theirMissingAll: [],
        counts: {
          theirDuplicatesYouNeed: 1,
          yourDuplicatesTheyNeed: 1,
          theirDuplicatesAll: 0,
          theirMissingAll: 0,
        },
      },
    });
    expect(msg).toContain("vos tenés repetido y a mí me sirve");
    expect(msg).toContain("#10");
    expect(msg).toContain("yo tengo repetido y a vos te puede servir");
    expect(msg).toContain("#20");
  });
});
