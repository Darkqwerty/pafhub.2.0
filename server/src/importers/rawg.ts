import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { JsonDatabase } from '../lib/jsondb.js';

const rawgIdSchema = z.coerce.number().int().positive();
const rawgGameSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1),
}).passthrough();
const rawgFileSchema = z.array(z.object({
  id: z.number().int().positive(),
  link: z.string().url(),
  raw: z.unknown(),
  importedAt: z.string().datetime(),
}));

export type RawgRecord = z.infer<typeof rawgFileSchema>[number];

const defaultDataFile = fileURLToPath(new URL('../../../rawg.json', import.meta.url));

async function fetchRawgRecord(gameIdInput: string | number): Promise<RawgRecord> {
  const id = rawgIdSchema.parse(gameIdInput);
  const apiKey = z.string().min(1, 'RAWG_API_KEY is required').parse(process.env.RAWG_API_KEY);
  const url = new URL(`https://api.rawg.io/api/games/${id}`);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    throw new Error(`RAWG returned HTTP ${response.status} for game ${id}`);
  }

  const raw: unknown = await response.json();
  const game = rawgGameSchema.parse(raw);
  if (game.id !== id) {
    throw new Error(`RAWG returned game ${game.id} for requested ID ${id}`);
  }

  const record: RawgRecord = {
    id,
    link: `https://rawg.io/games/${encodeURIComponent(game.slug)}`,
    raw,
    importedAt: new Date().toISOString(),
  };
  return record;
}

/** Imports one RAWG game by its numeric game ID and inserts or updates rawg.json. */
export async function importRawgGame(
  gameIdInput: string | number,
  filePath = process.env.RAWG_DATA_FILE ?? defaultDataFile,
): Promise<RawgRecord> {
  const record = await fetchRawgRecord(gameIdInput);
  const database = await JsonDatabase.open(filePath, rawgFileSchema);
  database.upsert(record);
  await database.save();
  return record;
}

async function runCli(): Promise<void> {
  const gameIds = process.argv.slice(2);
  if (gameIds.length === 0) {
    throw new Error('Usage: npm run import:rawg -- <gameId> [gameId ...]');
  }

  const database = await JsonDatabase.open(process.env.RAWG_DATA_FILE ?? defaultDataFile, rawgFileSchema);
  try {
    for (const gameId of gameIds) {
      const record = await fetchRawgRecord(gameId);
      database.upsert(record);
      console.log(`Imported RAWG game ${record.id} at ${record.importedAt}`);
    }
  } finally {
    await database.save();
  }
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(path.resolve(entryPath)).href) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
