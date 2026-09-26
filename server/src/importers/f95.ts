import 'dotenv/config';
import { Game, getHandiworkFromURL, isLogged, login, logout } from '@millenniumearl/f95api';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { JsonDatabase } from '../lib/jsondb.js';

const f95IdSchema = z.coerce.number().int().positive();
const f95CredentialsSchema = z.object({
  F95_USERNAME: z.string().min(1),
  F95_PASSWORD: z.string().min(1),
  F95_RECAPTCHA_TOKEN: z.string().min(1).optional(),
  F95_2FA_CODE: z.string().regex(/^\d{4,8}$/).optional(),
});
const f95FileSchema = z.array(z.object({
  id: z.number().int().positive(),
  link: z.string().url(),
  raw: z.unknown(),
  importedAt: z.string().datetime(),
}));

export type F95Record = z.infer<typeof f95FileSchema>[number];

const defaultDataFile = fileURLToPath(new URL('../../../f95.json', import.meta.url));

async function fetchF95Record(threadIdInput: string | number): Promise<F95Record> {
  const id = f95IdSchema.parse(threadIdInput);
  const credentials = f95CredentialsSchema.parse(process.env);
  const captchaCallback = credentials.F95_RECAPTCHA_TOKEN
    ? async () => credentials.F95_RECAPTCHA_TOKEN!
    : undefined;
  const twoFactorCallback = credentials.F95_2FA_CODE
    ? async () => Number(credentials.F95_2FA_CODE)
    : undefined;

  const loginResult = await login(
    credentials.F95_USERNAME,
    credentials.F95_PASSWORD,
    captchaCallback,
    twoFactorCallback,
  );
  if (!loginResult.success) {
    throw new Error(`F95 login failed: ${loginResult.message} (code ${loginResult.code})`);
  }

  try {
    const threadUrl = `https://f95zone.to/threads/${id}/`;
    const game = await getHandiworkFromURL(threadUrl, Game);
    if (game.id !== id) {
      throw new Error(`F95 returned thread ${game.id} for requested ID ${id}`);
    }

    const link = z.string().url().parse(game.url || threadUrl);
    const record: F95Record = {
      id,
      link,
      // The F95 client returns its typed model; JSON conversion preserves its
      // enumerable data fields and serializes Date values as ISO strings.
      raw: JSON.parse(JSON.stringify(game)) as unknown,
      importedAt: new Date().toISOString(),
    };
    return record;
  } finally {
    if (isLogged()) await logout();
  }
}

/** Imports an F95 game by thread ID and inserts or updates f95.json. */
export async function importF95Game(
  threadIdInput: string | number,
  filePath = process.env.F95_DATA_FILE ?? defaultDataFile,
): Promise<F95Record> {
  const record = await fetchF95Record(threadIdInput);
  const database = await JsonDatabase.open(filePath, f95FileSchema);
  database.upsert(record);
  await database.save();
  return record;
}

async function runCli(): Promise<void> {
  const threadIds = process.argv.slice(2);
  if (threadIds.length === 0) {
    throw new Error('Usage: npm run import:f95 -- <threadId> [threadId ...]');
  }

  const database = await JsonDatabase.open(process.env.F95_DATA_FILE ?? defaultDataFile, f95FileSchema);
  try {
    // Keep each F95 login lifecycle isolated while sharing one in-memory store.
    for (const threadId of threadIds) {
      const record = await fetchF95Record(threadId);
      database.upsert(record);
      console.log(`Imported F95 thread ${record.id} at ${record.importedAt}`);
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
