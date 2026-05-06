import { describe, expect, it } from "vitest";

import {
  formatOverlapStickerLine,
  parseExchangeOverlapDetail,
} from "./exchange-overlap-detail";

describe("parseExchangeOverlapDetail", () => {
  it("parser respuesta ok", () => {
    const d = parseExchangeOverlapDetail({
      ok: true,
      albumEdition: "PR-International",
      theirDuplicatesYouNeed: [],
      yourDuplicatesTheyNeed: [],
      theirDuplicatesAll: [
        {
          stickerId: "x",
          stickerNumber: 7,
          teamCode: "ARG",
          tradableQty: 2,
          playerName: null,
        },
      ],
      theirMissingAll: [
        {
          stickerId: "y",
          stickerNumber: 8,
          teamCode: "BRA",
          playerName: "Nombre",
        },
      ],
      counts: {
        theirDuplicatesYouNeed: 0,
        yourDuplicatesTheyNeed: 0,
        theirDuplicatesAll: 1,
        theirMissingAll: 1,
      },
    });
    expect(d?.ok).toBe(true);
    if (d?.ok) {
      expect(d.theirDuplicatesAll).toHaveLength(1);
      expect(d.theirMissingAll[0]?.playerName).toBe("Nombre");
    }
  });

  it("parser error", () => {
    expect(
      parseExchangeOverlapDetail({ ok: false, reason: "not_visible" })?.ok,
    ).toBe(false);
  });
});

describe("formatOverlapStickerLine", () => {
  it("formatea línea legible", () => {
    expect(
      formatOverlapStickerLine({
        stickerId: "id",
        stickerNumber: 142,
        teamCode: "FWC",
        playerName: "Messi",
      }),
    ).toContain("142");
    expect(
      formatOverlapStickerLine({
        stickerId: "id",
        stickerNumber: 142,
        teamCode: "FWC",
        playerName: null,
      }),
    ).toBe("#142 · FWC");
  });
});
