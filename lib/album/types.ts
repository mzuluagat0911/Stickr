export type UserStickerStatus = "have" | "duplicate" | "missing";

export type CatalogStickerDTO = {
  id: string;
  stickerNumber: number;
  teamCode: string;
  positionInTeam: number;
  type: string;
  playerName: string | null;
  playerPosition: string | null;
  imageUrl: string | null;
};

export type UserStickerEntryDTO = {
  status: Exclude<UserStickerStatus, "missing">;
  duplicateCount: number;
};

/** Mapa serializable: ausencia de clave = falta */
export type UserStickerMapDTO = Record<string, UserStickerEntryDTO>;
