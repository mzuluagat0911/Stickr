export const albumStickersQueryKey = (edition: string, userId: string) =>
  ["album-stickers", edition, userId] as const;

export const exchangeWantsQueryKey = (edition: string, userId: string) =>
  ["exchange-wants", edition, userId] as const;
