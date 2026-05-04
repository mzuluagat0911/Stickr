import { describe, expect, it } from "vitest";

import type { CatalogStickerDTO } from "@/lib/album/types";
import {
  getTeamSearchBlobMap,
  normalizeAlbumSearchText,
  stickerMatchesAlbumSearch,
} from "@/lib/teams/album-search";

const blobs = getTeamSearchBlobMap();

function s(partial: Partial<CatalogStickerDTO>): CatalogStickerDTO {
  return {
    id: partial.id ?? "x",
    stickerNumber: partial.stickerNumber ?? 1,
    teamCode: partial.teamCode ?? "ECU",
    positionInTeam: partial.positionInTeam ?? 1,
    type: partial.type ?? "player",
    playerName: partial.playerName ?? null,
    playerPosition: partial.playerPosition ?? null,
    imageUrl: partial.imageUrl ?? null,
  };
}

describe("normalizeAlbumSearchText", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalizeAlbumSearchText("México")).toBe("mexico");
    expect(normalizeAlbumSearchText("ESPAÑA")).toBe("espana");
  });
});

describe("stickerMatchesAlbumSearch", () => {
  it("coincide número exacto cuando la consulta es solo dígitos", () => {
    expect(
      stickerMatchesAlbumSearch(s({ stickerNumber: 16 }), "16", blobs),
    ).toBe(true);
    expect(
      stickerMatchesAlbumSearch(s({ stickerNumber: 160 }), "16", blobs),
    ).toBe(false);
    expect(
      stickerMatchesAlbumSearch(s({ stickerNumber: 116 }), "16", blobs),
    ).toBe(false);
  });

  it("intro FWC: búsqueda por n.º de álbum (0–19), no por n.º de catálogo 1–20", () => {
    expect(
      stickerMatchesAlbumSearch(
        s({ teamCode: "FWC", stickerNumber: 1 }),
        "0",
        blobs,
      ),
    ).toBe(true);
    expect(
      stickerMatchesAlbumSearch(
        s({ teamCode: "FWC", stickerNumber: 1 }),
        "00",
        blobs,
      ),
    ).toBe(true);
    expect(
      stickerMatchesAlbumSearch(
        s({ teamCode: "FWC", stickerNumber: 2 }),
        "1",
        blobs,
      ),
    ).toBe(true);
    expect(
      stickerMatchesAlbumSearch(
        s({ teamCode: "FWC", stickerNumber: 1 }),
        "1",
        blobs,
      ),
    ).toBe(false);
    expect(
      stickerMatchesAlbumSearch(
        s({ teamCode: "FWC", stickerNumber: 20 }),
        "19",
        blobs,
      ),
    ).toBe(true);
  });

  it("por código FIFA", () => {
    expect(
      stickerMatchesAlbumSearch(s({ teamCode: "ECU" }), "ecu", blobs),
    ).toBe(true);
  });

  it("por país en español (blob)", () => {
    expect(
      stickerMatchesAlbumSearch(s({ teamCode: "BRA" }), "brasil", blobs),
    ).toBe(true);
    expect(
      stickerMatchesAlbumSearch(s({ teamCode: "ESP" }), "españa", blobs),
    ).toBe(true);
  });
});
