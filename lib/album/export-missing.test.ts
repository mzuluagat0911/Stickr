import { describe, expect, it } from "vitest";

import {
  formatStickerNumbersWhatsApp,
  formatStickersWhatsApp,
  stickerExportLine,
} from "@/lib/album/export-missing";
import type { CatalogStickerDTO } from "@/lib/album/types";

function sticker(
  partial: Partial<CatalogStickerDTO> &
    Pick<CatalogStickerDTO, "teamCode" | "positionInTeam" | "type">,
): CatalogStickerDTO {
  return {
    id: partial.id ?? `PR-INT-${partial.stickerNumber ?? 99}`,
    stickerNumber: partial.stickerNumber ?? 99,
    teamCode: partial.teamCode,
    positionInTeam: partial.positionInTeam,
    type: partial.type,
    playerName: partial.playerName ?? null,
    playerPosition: partial.playerPosition ?? null,
    imageUrl: partial.imageUrl ?? null,
  };
}

describe("stickerExportLine", () => {
  it("usa nomenclatura Panini (código + ranura), no nombres inventados", () => {
    expect(
      stickerExportLine(
        sticker({
          teamCode: "ARG",
          positionInTeam: 4,
          type: "regular",
          stickerNumber: 125,
        }),
      ),
    ).toBe("ARG 5 · Jugador");

    expect(
      stickerExportLine(
        sticker({
          teamCode: "ARG",
          positionInTeam: 0,
          type: "team_crest",
          stickerNumber: 121,
        }),
      ),
    ).toBe("ARG 1 · Escudo");
  });

  it("añade nombre solo si viene en catálogo", () => {
    expect(
      stickerExportLine(
        sticker({
          teamCode: "ARG",
          positionInTeam: 4,
          type: "regular",
          playerName: "Messi",
        }),
      ),
    ).toBe("ARG 5 · Jugador · Messi");
  });
});

describe("formatStickersWhatsApp", () => {
  it("agrupa por país con bandera y etiqueta de álbum", () => {
    const text = formatStickersWhatsApp(
      [
        sticker({
          teamCode: "BRA",
          positionInTeam: 4,
          type: "regular",
          stickerNumber: 200,
        }),
        sticker({
          teamCode: "ARG",
          positionInTeam: 0,
          type: "team_crest",
          stickerNumber: 100,
        }),
      ],
      "faltantes",
      { edition: "PR-International" },
    );

    expect(text).toContain("📋 Stickr · Me faltan 2 figuritas");
    expect(text).toContain("🇦🇷 Argentina");
    expect(text).toContain("ARG 1 · Escudo");
    expect(text).toContain("🇧🇷 Brasil");
    expect(text).toContain("BRA 5 · Jugador");
    expect(text).not.toContain("Messi");
    expect(text).not.toContain("#200");
  });

  it("muestra cantidad en repetidas", () => {
    const s = sticker({
      id: "MEX05",
      teamCode: "MEX",
      positionInTeam: 4,
      type: "regular",
      stickerNumber: 50,
    });
    const text = formatStickersWhatsApp([s], "repetidas", {
      userMap: { MEX05: { status: "duplicate", duplicateCount: 4 } },
    });

    expect(text).toContain("MEX 5 · Jugador ×4");
  });
});

describe("formatStickerNumbersWhatsApp", () => {
  it("lista etiquetas Panini por bandera", () => {
    const text = formatStickerNumbersWhatsApp([
      sticker({
        teamCode: "ARG",
        positionInTeam: 0,
        type: "team_crest",
        stickerNumber: 10,
      }),
      sticker({
        teamCode: "ARG",
        positionInTeam: 4,
        type: "regular",
        stickerNumber: 11,
      }),
      sticker({
        teamCode: "BRA",
        positionInTeam: 1,
        type: "regular",
        stickerNumber: 20,
      }),
    ]);

    expect(text).toBe("🇦🇷 ARG 1, ARG 5\n🇧🇷 BRA 2");
  });
});
