import { describe, expect, it } from "vitest";

import {
  formatOverlapStickerLine,
  overlapStickerCatalogDto,
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

describe("overlapStickerCatalogDto", () => {
  it("parsea id TEAM + ranura como en el catálogo", () => {
    const d = overlapStickerCatalogDto({
      stickerId: "ARG05",
      stickerNumber: 125,
      teamCode: "ARG",
      playerName: null,
    });
    expect(d).not.toBeNull();
    expect(d!.positionInTeam).toBe(4);
    expect(d!.type).toBe("regular");
  });

  it("parsea PR-INT intro FWC", () => {
    const d = overlapStickerCatalogDto({
      stickerId: "PR-INT-1",
      stickerNumber: 1,
      teamCode: "FWC",
      playerName: null,
    });
    expect(d).not.toBeNull();
    expect(d!.teamCode).toBe("FWC");
    expect(d!.positionInTeam).toBe(0);
  });
});

describe("formatOverlapStickerLine", () => {
  it("usa nomenclatura del álbum (no #número de catálogo)", () => {
    expect(
      formatOverlapStickerLine({
        stickerId: "MEX01",
        stickerNumber: 601,
        teamCode: "MEX",
        playerName: null,
        tradableQty: 2,
      }),
    ).toBe("MEX 1 · Escudo · ×2 disp.");

    expect(
      formatOverlapStickerLine({
        stickerId: "ARG05",
        stickerNumber: 125,
        teamCode: "ARG",
        playerName: null,
      }),
    ).toBe("ARG 5 · Jugador");
  });

  it("FWC intro alineado con slot-label", () => {
    expect(
      formatOverlapStickerLine({
        stickerId: "PR-INT-1",
        stickerNumber: 1,
        teamCode: "FWC",
        playerName: null,
      }),
    ).toBe("FWC 00 · Intro");
  });

  it("fallback si id desconocido", () => {
    expect(
      formatOverlapStickerLine({
        stickerId: "legacy-id",
        stickerNumber: 142,
        teamCode: "XYZ",
        playerName: null,
      }),
    ).toBe("#142 · XYZ");
  });
});
