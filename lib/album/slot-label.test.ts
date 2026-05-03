import { describe, expect, it } from "vitest";

import { catalogSlotLabel } from "@/lib/album/slot-label";
import type { CatalogStickerDTO } from "@/lib/album/types";

function dto(
  partial: Partial<CatalogStickerDTO> & Pick<CatalogStickerDTO, "teamCode">,
): CatalogStickerDTO {
  return {
    id: "PR-INT-99",
    stickerNumber: 99,
    teamCode: partial.teamCode,
    positionInTeam: partial.positionInTeam ?? 0,
    type: partial.type ?? "regular",
    playerName: partial.playerName ?? null,
    playerPosition: partial.playerPosition ?? null,
    imageUrl: partial.imageUrl ?? null,
  };
}

describe("catalogSlotLabel", () => {
  it("selección: escudo, grupal, equipo, jugador", () => {
    expect(
      catalogSlotLabel(
        dto({ teamCode: "ARG", positionInTeam: 0, type: "team_crest" }),
      ),
    ).toBe("Escudo");
    expect(
      catalogSlotLabel(
        dto({ teamCode: "ARG", positionInTeam: 1, type: "team_photo" }),
      ),
    ).toBe("Grupal");
    expect(
      catalogSlotLabel(
        dto({ teamCode: "ARG", positionInTeam: 5, type: "team_photo" }),
      ),
    ).toBe("Equipo");
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
