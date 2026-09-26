import { z } from 'zod';

export const catalogQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

// Demo data keeps the UI useful before provider credentials are configured.
const demoGames = [
  { id: 'silksong', title: 'Hollow Knight: Silksong', developer: 'Team Cherry', genre: 'Action · Metroidvania', rating: 9.4, status: 'Popular', source: 'demo' },
  { id: 'expedition-33', title: 'Clair Obscur: Expedition 33', developer: 'Sandfall Interactive', genre: 'RPG · Turn-based', rating: 9.2, status: 'New', source: 'demo' },
  { id: 'hades-2', title: 'Hades II', developer: 'Supergiant Games', genre: 'Action · Roguelike', rating: 9.1, status: 'Early access', source: 'demo' },
  { id: 'the-alters', title: 'The Alters', developer: '11 bit studios', genre: 'Adventure · Sci-fi', rating: 8.7, status: 'Just added', source: 'demo' },
  { id: 'balatro', title: 'Balatro', developer: 'LocalThunk', genre: 'Strategy · Cards', rating: 9.0, status: 'Trending', source: 'demo' },
];

export function getCatalog(query: CatalogQuery) {
  const search = query.search?.toLocaleLowerCase();
  const results = search ? demoGames.filter((game) => game.title.toLocaleLowerCase().includes(search)) : demoGames;
  return results.slice(0, query.limit);
}
