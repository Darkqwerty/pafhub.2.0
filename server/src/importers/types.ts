/**
 * A game the user already owns on a provider, as returned by that provider's
 * account/library listing. `id` is the provider-specific record ID that maps to
 * `GameRecord.source.id`.
 */
export type OwnedGame = {
    id: number;
    title: string;
};
