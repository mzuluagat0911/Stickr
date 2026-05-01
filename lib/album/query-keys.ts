export const albumStickersQueryKey = (edition: string, userId: string) =>
  ["album-stickers", edition, userId] as const;
