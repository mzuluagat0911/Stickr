import { describe, expect, it } from "vitest";

import type { CatalogStickerDTO } from "@/lib/album/types";
import {
  parseStickerNumberTokens,
  resolveStickerIdsFromNumbers,
} from "./bulk-numbers";

const miniCatalog = [
  {
    id: "a",
    stickerNumber: 1,
    teamCode: "X",
    positionInTeam: 1,
  } as CatalogStickerDTO,
  {
    id: "b",
    stickerNumber: 5,
    teamCode: "X",
    positionInTeam: 2,
  } as CatalogStickerDTO,
  {
    id: "c",
    stickerNumber: 10,
    teamCode: "X",
    positionInTeam: 3,
  } as CatalogStickerDTO,
];

describe("parseStickerNumberTokens", () => {
  it("parsea coma, nueva línea y rango único en dash ASCII", () => {
    expect(parseStickerNumberTokens("1,\n 5")).toEqual([1, 5]);
    expect(parseStickerNumberTokens("10-11")).toEqual([10, 11]);
  });

  it("dedup y orden ascendente", () => {
    expect(parseStickerNumberTokens("10,10,10,5")).toEqual([5, 10]);
  });
});

describe("resolveStickerIdsFromNumbers", () => {
  it("resuelve sólo números del catálogo y reporta unmatched", () => {
    const r = resolveStickerIdsFromNumbers([1, 2, 5], miniCatalog);
    expect(r.stickerIds).toEqual(["a", "b"]);
    expect(r.unmatched).toEqual([2]);
  });
});
