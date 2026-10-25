import 'dotenv/config';
// F95Zone thread metadata (title, version, overview) is public, so the importer
// needs no account credentials. The only hurdle is Cloudflare's "Just a moment…"
// bot challenge: it flags Node's TLS fingerprint but lets a plain curl request
// through, so we fetch via a curl subprocess and retry the challenge with a
// pause when it appears.
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { z } from 'zod';
import { load } from 'cheerio';
import { JsonDatabase } from '../lib/jsondb.js';
import type { OwnedGame } from './types.js';

const execFileAsync = promisify(execFile);

const F95_BASE = 'https://f95zone.to';
const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const CHALLENGE_MARKER = 'Just a moment';
const F95_RETRY_ATTEMPTS = 3;
const F95_RETRY_DELAYS_MS = [4000, 8000, 16000];

const f95IdSchema = z.coerce.number().int().positive();

const f95FileSchema = z.array(z.object({
    id: z.number().int().positive(),
    link: z.string().url(),
    raw: z.unknown(),
    importedAt: z.string().datetime(),
}));

export type F95Record = z.infer<typeof f95FileSchema>[number];

const defaultDataFile = fileURLToPath(new URL('../../../db/f95.json', import.meta.url));

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCloudflareChallenge(status: number, body: unknown): boolean {
    return status === 403 && typeof body === 'string' && body.includes(CHALLENGE_MARKER);
}

type CurlResult = { status: number; finalUrl: string; body: string };

/**
 * Fetches a URL through curl. `-L` follows redirects (curl is not challenged by
 * Cloudflare for the redirect the way Node is), `%{url_effective}` reports the
 * final URL, and the body is written to a temp file so large pages never hit the
 * subprocess output buffer.
 */
async function curlGet(url: string): Promise<CurlResult> {
    const dir = await mkdtemp(path.join(tmpdir(), 'f95-'));
    const bodyPath = path.join(dir, 'body.html');
    try {
        const { stdout } = await execFileAsync(
            'curl',
            [
                '-sSL',
                '-A', USER_AGENT,
                '--max-time', '30',
                '--compressed',
                '-o', bodyPath,
                '-w', '%{http_code} %{url_effective}',
                url,
            ],
            { encoding: 'utf8', windowsHide: true },
        );
        const trimmed = stdout.trim();
        const spaceIndex = trimmed.indexOf(' ');
        const status = Number.parseInt(spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex), 10);
        const finalUrl = spaceIndex === -1 ? url : trimmed.slice(spaceIndex + 1);
        const body = await readFile(bodyPath, 'utf8');
        return { status, finalUrl, body };
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

async function curlGetWithRetry(url: string): Promise<CurlResult> {
    let lastError: Error = new Error('F95 request failed');
    for (let attempt = 0; attempt < F95_RETRY_ATTEMPTS; attempt++) {
        if (attempt > 0) await sleep(F95_RETRY_DELAYS_MS[attempt - 1] ?? 16000);
        try {
            const result = await curlGet(url);
            if (!isCloudflareChallenge(result.status, result.body)) return result;
            lastError = new Error('F95Zone (Cloudflare) blocked the request; try again later');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error('curl is required for the F95 importer but was not found on PATH');
            }
            lastError = error instanceof Error ? error : new Error('F95 request failed');
        }
    }
    throw lastError;
}

function cleanName(headline: string): string {
    return headline.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function versionFromHeadline(headline: string): string {
    return (/\[v([^\]]+)\]/i.exec(headline) ?? [])[1]?.trim() ?? '';
}

async function fetchF95Record(threadIdInput: string | number): Promise<F95Record> {
    const id = f95IdSchema.parse(threadIdInput);
    const bareUrl = `${F95_BASE}/threads/${id}/`;
    const { status, finalUrl, body } = await curlGetWithRetry(bareUrl);
    if (status === 404) throw new Error(`F95 thread ${id} not found`);
    if (status !== 200) throw new Error(`F95 returned HTTP ${status} for thread ${id}`);

    const threadUrl = new URL(finalUrl || bareUrl, F95_BASE).toString();
    const $ = load(body);

    // Headline like "Galactic Outlaws [v0.12] [GUS]" from JSON-LD, with the
    // thread title as a fallback.
    let headline = '';
    const jsonLd = $('script[type="application/ld+json"]').first().html();
    if (jsonLd) {
        try {
            headline = (JSON.parse(jsonLd).mainEntity ?? {}).headline ?? '';
        } catch {
            headline = '';
        }
    }
    if (!headline) headline = $('h1.p-title-value').text().trim();

    // Opening-post body carries the labelled metadata (Overview, Version, …).
    const post = $('article.message .bbWrapper').first().text();
    const overview =
        (/Overview:\s*([\s\S]*?)(?=\n(?:Thread Updated|Release Date|Developer|Censored|Version|OS|Language|Genre|Installation|Changelog|Other Games):)/i.exec(
            post,
        ) ?? [])[1]?.trim() ?? '';
    const versionFromPost = (/^Version:\s*(.+)$/im.exec(post) ?? [])[1]?.trim() ?? '';

    const raw = {
        id,
        name: cleanName(headline) || headline || `F95 thread ${id}`,
        overview:
            overview ||
            $('meta[name="description"]').attr('content')?.replace(/^Overview:\s*/i, '').trim() ||
            '',
        version: versionFromHeadline(headline) || versionFromPost,
        url: threadUrl,
    };

    const record: F95Record = {
        id,
        link: threadUrl,
        raw,
        importedAt: new Date().toISOString(),
    };
    return record;
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

/**
 * F95Zone has no per-account purchase library, so the library update cannot
 * discover owned games for this service. Stub kept so every provider exposes
 * the same owned-games contract as Steam.
 */
export async function listF95OwnedGames(): Promise<OwnedGame[]> {
    return [];
}

async function runCli(): Promise<void> {
    const threadIds = process.argv.slice(2);
    if (threadIds.length === 0) {
        throw new Error('Usage: npm run import:f95 -- <threadId> [threadId ...]');
    }

    const database = await JsonDatabase.open(process.env.F95_DATA_FILE ?? defaultDataFile, f95FileSchema);
    try {
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
