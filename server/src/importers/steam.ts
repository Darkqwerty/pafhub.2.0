import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { z } from 'zod';
import { JsonDatabase } from '../lib/jsondb.js';

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

export type SteamRecord = z.infer<typeof steamRecordSchema>;

const defaultDataFile = fileURLToPath(new URL('../../../steam.json', import.meta.url));

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
