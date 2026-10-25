/**
 * A game the user already owns on a provider, as returned by that provider's
 * account/library listing. `id` is the provider-specific record ID that maps to
 * `GameRecord.source.id`. Numeric providers (Steam/RAWG/F95) use numbers; Epic
 * uses a `namespace:catalogItemId` string.
 */
export type OwnedGame = {
    id: number | string;
    title: string;
};
