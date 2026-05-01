import { describe, expect, it } from "vitest";

import { computeAlbumProgress } from "@/lib/album/progress";
import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";

const tinyCatalog: CatalogStickerDTO[] = [
  {
    id: "a",
    stickerNumber: 1,
    teamCode: "FWC",
    positionInTeam: 0,
    type: "regular",
    playerName: null,
    playerPosition: null,
    imageUrl: null,
  },
  {
    id: "b",
    stickerNumber: 2,
    teamCode: "FWC",
    positionInTeam: 0,
    type: "regular",
    playerName: null,
    playerPosition: null,
    imageUrl: null,
  },
  {
    id: "c",
    stickerNumber: 3,
    teamCode: "ARG",
    positionInTeam: 0,
    type: "team_crest",
    playerName: null,
    playerPosition: null,
    imageUrl: null,
  },
];

describe("computeAlbumProgress", () => {
  it("todo falta sin mapa", () => {
    const m: UserStickerMapDTO = {};
    const p = computeAlbumProgress(tinyCatalog, m);
    expect(p.total).toBe(3);
    expect(p.have).toBe(0);
    expect(p.duplicateStickers).toBe(0);
    expect(p.duplicateExtraCopies).toBe(0);
    expect(p.missing).toBe(3);
    expect(p.percentCollected).toBe(0);
    expect(p.bar.green).toBe(0);
    expect(p.bar.gold).toBe(0);
    expect(p.bar.gray).toBe(1);
    expect(p.byTeam.FWC.missing).toBe(2);
    expect(p.byTeam.ARG.missing).toBe(1);
  });

  it("have y duplicate con copias extra", () => {
    const m: UserStickerMapDTO = {
      a: { status: "have", duplicateCount: 0 },
      b: { status: "duplicate", duplicateCount: 4 },
    };
    const p = computeAlbumProgress(tinyCatalog, m);
    expect(p.have).toBe(1);
    expect(p.duplicateStickers).toBe(1);
    expect(p.duplicateExtraCopies).toBe(3);
    expect(p.missing).toBe(1);
    expect(p.percentCollected).toBeCloseTo(2 / 3);
    expect(p.bar.green).toBeCloseTo(1 / 3);
    expect(p.bar.gold).toBeCloseTo(1 / 3);
    expect(p.bar.gray).toBeCloseTo(1 / 3);
  });
});
