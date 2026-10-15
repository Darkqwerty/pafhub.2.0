import 'dotenv/config';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { z } from 'zod';
import { getSettings } from '../settings.js';
import { JsonDatabase } from '../lib/jsondb.js';
import type { OwnedGame } from './types.js';

const steamRecordSchema = z.object({
  id: z.number().int().positive(),
  link: z.string().url(),
  raw: z.unknown(),
  importedAt: z.string().datetime(),
});

const steamFileSchema = z.array(steamRecordSchema);
const steamIdSchema = z.coerce.number().int().positive();
const upstreamEntrySchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
}).passthrough();
const ownedGamesResponseSchema = z.object({
  response: z
    .object({
      game_count: z.number().int().nonnegative().optional(),
      games: z
        .array(
          z
            .object({
              appid: z.number().int().positive(),
              name: z.string().optional(),
            })
            .passthrough(),
        )
        .optional(),
    })
    .passthrough(),
});

export type SteamRecord = z.infer<typeof steamRecordSchema>;

const defaultDataFile = fileURLToPath(new URL('../../../db/steam.json', import.meta.url));

async function fetchSteamRaw(id: number): Promise<unknown> {
  const url = new URL('https://store.steampowered.com/api/appdetails');
  url.searchParams.set('appids', String(id));

  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    throw new Error(`Steam returned HTTP ${response.status} for app ${id}`);
  }

  const responseJson: unknown = await response.json();
  const appResult = z.record(z.string(), upstreamEntrySchema).parse(responseJson)[String(id)];
  if (!appResult?.success || appResult.data === undefined) {
    throw new Error(`Steam did not return details for app ${id}`);
  }

  return appResult;
}

async function fetchSteamRecord(appIdInput: string | number): Promise<SteamRecord> {
  const id = steamIdSchema.parse(appIdInput);
  const raw = await fetchSteamRaw(id);
  return {
    id,
    link: `https://store.steampowered.com/app/${id}/`,
    raw,
    importedAt: new Date().toISOString(),
  };
}

/**
 * Lists the games owned by the configured Steam account through
 * IPlayerService/GetOwnedGames. Requires STEAM_API_KEY and STEAM_ID; the
 * account's game details must be public for Steam to return them.
 */
export async function listSteamOwnedGames(): Promise<OwnedGame[]> {
  const settings = await getSettings();
  const apiKey = (settings.STEAM_API_KEY || process.env.STEAM_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('STEAM_API_KEY is required to list owned Steam games');
  }
  if (!/^[0-9a-f]{32}$/i.test(apiKey)) {
    throw new Error(
      'STEAM_API_KEY is not a valid Steam Web API key (expected 32 hex characters); get one at https://steamcommunity.com/dev/apikey',
    );
  }
  const steamId = (settings.STEAM_ID || process.env.STEAM_ID || '').trim();
  if (!/^\d{17}$/.test(steamId)) {
    throw new Error('STEAM_ID must be a 17-digit SteamID64 to list owned Steam games');
  }

  const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('steamid', steamId);
  url.searchParams.set('include_appinfo', '1');
  url.searchParams.set('include_played_free_games', '1');
  url.searchParams.set('format', 'json');

  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        'Steam rejected the API key (HTTP 401); check STEAM_API_KEY in Settings — get a key at https://steamcommunity.com/dev/apikey',
      );
    }
    throw new Error(`Steam returned HTTP ${response.status} for the owned games list`);
  }

  const parsed = ownedGamesResponseSchema.parse(await response.json());
  const games = parsed.response.games ?? [];
  if (games.length === 0) {
    throw new Error(
      'Steam returned no owned games; verify STEAM_ID and that the profile game details are public',
    );
  }

  const owned = new Map<number, OwnedGame>();
  for (const game of games) {
    owned.set(game.appid, { id: game.appid, title: (game.name ?? '').slice(0, 200) });
  }
  return [...owned.values()];
}

/** Imports one Steam app and inserts or replaces its record in steam.json. */
export async function importSteamGame(
  appIdInput: string | number,
  filePath = process.env.STEAM_DATA_FILE ?? defaultDataFile,
): Promise<SteamRecord> {
  const record = await fetchSteamRecord(appIdInput);
  const database = await JsonDatabase.open(filePath, steamFileSchema);
  database.upsert(record);
  await database.save();
  return record;
}

async function runCli(): Promise<void> {
  const appIds = process.argv.slice(2);
  if (appIds.length === 0) {
    throw new Error('Usage: npm run import:steam -- <appId> [appId ...]');
  }

  const database = await JsonDatabase.open(process.env.STEAM_DATA_FILE ?? defaultDataFile, steamFileSchema);
  try {
    for (const appId of appIds) {
      const record = await fetchSteamRecord(appId);
      database.upsert(record);
      console.log(`Imported Steam app ${record.id} at ${record.importedAt}`);
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
