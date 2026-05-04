import { describe, expect, it } from "vitest";

import {
  catalogSlotLabel,
  catalogStickerDisplayLabel,
} from "@/lib/album/slot-label";
import type { CatalogStickerDTO } from "@/lib/album/types";

function dto(
  partial: Partial<CatalogStickerDTO> & Pick<CatalogStickerDTO, "teamCode">,
): CatalogStickerDTO {
  return {
    id: "PR-INT-99",
    stickerNumber: partial.stickerNumber ?? 99,
    teamCode: partial.teamCode,
    positionInTeam: partial.positionInTeam ?? 0,
    type: partial.type ?? "regular",
    playerName: partial.playerName ?? null,
    playerPosition: partial.playerPosition ?? null,
    imageUrl: partial.imageUrl ?? null,
  };
}

describe("catalogStickerDisplayLabel", () => {
  it("selección: código FIFA + ranura 1–20", () => {
    expect(
      catalogStickerDisplayLabel(
        dto({ teamCode: "MEX", positionInTeam: 0, stickerNumber: 601 }),
      ),
    ).toBe("MEX 1");
    expect(
      catalogStickerDisplayLabel(
        dto({ teamCode: "MEX", positionInTeam: 12, stickerNumber: 613 }),
      ),
    ).toBe("MEX 13");
  });

  it("FWC y museo: código + ranura", () => {
    expect(
      catalogStickerDisplayLabel(
        dto({ teamCode: "FWC", positionInTeam: 4, stickerNumber: 5 }),
      ),
    ).toBe("FWC 5");
    expect(
      catalogStickerDisplayLabel(
        dto({ teamCode: "MUSEUM", positionInTeam: 2, stickerNumber: 983 }),
      ),
    ).toBe("MUSEUM 3");
  });
});

describe("catalogSlotLabel", () => {
  it("selección: escudo, grupal, jugador", () => {
    expect(
      catalogSlotLabel(
        dto({ teamCode: "ARG", positionInTeam: 0, type: "team_crest" }),
      ),
    ).toBe("Escudo");
    expect(
      catalogSlotLabel(
        dto({ teamCode: "ARG", positionInTeam: 12, type: "team_photo" }),
      ),
    ).toBe("Grupal");
    expect(
      catalogSlotLabel(
        dto({ teamCode: "ARG", positionInTeam: 1, type: "regular" }),
      ),
    ).toBe("Jugador");
    expect(
      catalogSlotLabel(
        dto({ teamCode: "ARG", positionInTeam: 14, type: "regular" }),
      ),
    ).toBe("Jugador");
  });

  it("FWC intro y especiales", () => {
    expect(
      catalogSlotLabel(
        dto({ teamCode: "FWC", positionInTeam: 0, type: "regular" }),
      ),
    ).toBe("Intro");
    expect(
      catalogSlotLabel(
        dto({ teamCode: "FWC", positionInTeam: 0, type: "team_photo" }),
      ),
    ).toBe("Grupal");
    expect(
      catalogSlotLabel(
        dto({ teamCode: "FWC", positionInTeam: 0, type: "special_gold" }),
      ),
    ).toBe("Especial");
  });

  it("Museo", () => {
    expect(
      catalogSlotLabel(
        dto({
          teamCode: "MUSEUM",
          positionInTeam: 3,
          type: "special_legendary",
        }),
      ),
    ).toBe("Museo");
  });
});
