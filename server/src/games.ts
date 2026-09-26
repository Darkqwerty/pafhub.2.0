import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { JsonDatabase } from './lib/jsondb.js';

export const gameStatusSchema = z.enum(['Completed', 'Uncompleted', 'Played', 'WantPlay']);
export const gameSourceSchema = z.object({
  service: z.enum(['steam', 'rawg', 'f95']),
  id: z.number().int().positive(),
});

const gameFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000),
  version: z.string().max(100),
  source: gameSourceSchema,
  status: gameStatusSchema,
  folder: z.string().max(500),
  online: z.boolean(),
});

export const gameSchema = gameFieldsSchema.extend({
  id: z.string().trim().min(1).max(100),
});

export const createGameSchema = gameFieldsSchema.extend({
  id: z.string().trim().min(1).max(100).optional(),
});

export const gamesListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type GameRecord = z.infer<typeof gameSchema>;
export type GamesListQuery = z.infer<typeof gamesListQuerySchema>;

const defaultDataFile = fileURLToPath(new URL('../../games.json', import.meta.url));
const dataFile = process.env.GAMES_DATA_FILE ?? defaultDataFile;
const gamesFileSchema = z.array(gameSchema);

export function getGamesDatabase(): Promise<JsonDatabase<GameRecord>> {
  return JsonDatabase.open<GameRecord>(dataFile, gamesFileSchema);
}

export async function listGames(query: GamesListQuery) {
  const database = await getGamesDatabase();
  const search = query.search?.toLocaleLowerCase();
  const filtered = database.all().filter((game) => !search ||
    `${game.title} ${game.description} ${game.version} ${game.folder} ${game.source.service} ${game.source.id} ${game.status}`
      .toLocaleLowerCase()
      .includes(search));

  return {
    data: filtered.slice(query.offset, query.offset + query.limit),
    total: filtered.length,
    limit: query.limit,
    offset: query.offset,
  };
}

export async function getGame(id: string): Promise<GameRecord | undefined> {
  return (await getGamesDatabase()).get(id);
}

export async function createGame(input: z.infer<typeof createGameSchema>): Promise<GameRecord | undefined> {
  const database = await getGamesDatabase();
  const game = gameSchema.parse({ ...input, id: input.id ?? randomUUID() });
  if (database.get(game.id)) return undefined;
  database.upsert(game);
  await database.save();
  return game;
}

export async function replaceGame(id: string, input: z.infer<typeof gameFieldsSchema>): Promise<GameRecord | undefined> {
  const database = await getGamesDatabase();
  if (!database.get(id)) return undefined;
  const game = gameSchema.parse({ ...input, id });
  database.upsert(game);
  await database.save();
  return game;
}

export async function patchGame(
  id: string,
  input: Partial<z.infer<typeof gameFieldsSchema>>,
): Promise<GameRecord | undefined> {
  const database = await getGamesDatabase();
  const current = database.get(id);
  if (!current) return undefined;
  const game = gameSchema.parse({ ...current, ...input, id });
  database.upsert(game);
  await database.save();
  return game;
}

export async function deleteGame(id: string): Promise<boolean> {
  const database = await getGamesDatabase();
  if (!database.delete(id)) return false;
  await database.save();
  return true;
}
