import { randomUUID } from 'node:crypto';
import { type Dirent } from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { JsonDatabase } from './lib/jsondb.js';
import { getSettings } from './settings.js';
import type { OwnedGame } from './importers/types.js';

export const gameStatusSchema = z.enum(['Completed', 'Uncompleted', 'Played', 'WantPlay']);
export const gameSourceSchema = z.object({
    service: z.enum(['steam', 'rawg', 'f95', 'epic']),
    // Numeric providers use their record ID; Epic uses a `namespace:catalogItemId` string.
    id: z.union([z.number().int().positive(), z.string().trim().min(1).max(200)])
});

export type GameService = z.infer<typeof gameSourceSchema>['service'];

const folderSchema = z
    .string()
    .trim()
    .max(255)
    .refine(
        (folder) =>
            !folder ||
            (!/[<>:"/\\|?*\u0000-\u001f]/.test(folder) &&
                folder !== '.' &&
                folder !== '..' &&
                !/[. ]$/.test(folder) &&
                !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(folder)),
        'Folder must be a single valid directory name'
    );

export const gameFieldsSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000),
    version: z.string().max(100),
    source: gameSourceSchema.nullable(),
    status: gameStatusSchema,
    folder: folderSchema,
    online: z.boolean()
});

export const gameSchema = gameFieldsSchema.extend({
    id: z.string().trim().min(1).max(100)
});

export const createGameSchema = z.object({
    id: z.string().trim().min(1).max(100).optional(),
    title: z.string().trim().max(200).optional(),
    description: z.string().max(5000).optional(),
    version: z.string().max(100).optional(),
    source: gameSourceSchema.nullable().default(null),
    status: gameStatusSchema.default('WantPlay'),
    folder: folderSchema.default(''),
    online: z.boolean().default(false)
}).superRefine((game, context) => {
    if (!game.source && !game.title?.trim()) {
        context.addIssue({ code: 'custom', path: ['title'], message: 'Title is required for a local game' });
    }
});

export const gamesListQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
    service: z.enum(['steam', 'rawg', 'f95', 'epic']).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0)
});

export type GameRecord = z.infer<typeof gameSchema>;
export type GamesListQuery = z.infer<typeof gamesListQuerySchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;

export class GameSourceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GameSourceError';
    }
}

const defaultDataFile = fileURLToPath(new URL('../../db/games.json', import.meta.url));
const dataFile = process.env.GAMES_DATA_FILE ?? defaultDataFile;
const contentDirectory =
    process.env.CONTENT_DIR ?? fileURLToPath(new URL('../../content/', import.meta.url));
const gamesFileSchema = z.array(gameSchema);

const sourceDataFiles: Record<NonNullable<GameRecord['source']>['service'], string> = {
    steam:
        process.env.STEAM_DATA_FILE ?? fileURLToPath(new URL('../../db/steam.json', import.meta.url)),
    rawg:
        process.env.RAWG_DATA_FILE ?? fileURLToPath(new URL('../../db/rawg.json', import.meta.url)),
    f95: process.env.F95_DATA_FILE ?? fileURLToPath(new URL('../../db/f95.json', import.meta.url)),
    epic:
        process.env.EPIC_DATA_FILE ?? fileURLToPath(new URL('../../db/epic.json', import.meta.url))
};

export function getGamesDatabase(): Promise<JsonDatabase<GameRecord>> {
    return JsonDatabase.open<GameRecord>(dataFile, gamesFileSchema);
}

function asObject(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function cleanDescription(value: unknown): string {
    return text(value)
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*/g, '\n')
        .trim()
        .slice(0, 5000);
}

type SourceFetchResult = { raw: unknown; link: string };

async function fetchSourceRecord(source: NonNullable<GameRecord['source']>): Promise<SourceFetchResult> {
    try {
        switch (source.service) {
            case 'steam': {
                const record = await (await import('./importers/steam.js')).importSteamGame(
                    source.id
                );
                return { raw: record.raw, link: record.link };
            }
            case 'rawg': {
                const record = await (await import('./importers/rawg.js')).importRawgGame(
                    source.id
                );
                return { raw: record.raw, link: record.link };
            }
            case 'f95': {
                const record = await (await import('./importers/f95.js')).importF95Game(source.id);
                return { raw: record.raw, link: record.link };
            }
            case 'epic': {
                const record = await (await import('./importers/epic.js')).importEpicGame(source.id);
                return { raw: record.raw, link: record.link };
            }
        }
    } catch (error) {
        throw new GameSourceError(error instanceof Error ? error.message : 'Source request failed');
    }
}

function firstUrl(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
}

function epicImage(rawValue: unknown): string | null {
    const images = asObject(rawValue).keyImages;
    if (Array.isArray(images)) {
        for (const entry of images) {
            const url = firstUrl(asObject(entry).url);
            if (url) return url;
        }
    }
    return null;
}

function mapSourceDetails(
    service: NonNullable<GameRecord['source']>['service'],
    rawValue: unknown,
    link: string
) {
    const root = asObject(rawValue);
    if (service === 'steam') {
        const details = asObject(root.data);
        return {
            title: text(details.name).slice(0, 200),
            description: cleanDescription(details.about_the_game ?? details.short_description),
            version: text(details.version).slice(0, 100),
            online: false,
            image: firstUrl(details.header_image),
            link
        };
    }
    if (service === 'rawg') {
        return {
            title: text(root.name).slice(0, 200),
            description: cleanDescription(root.description_raw ?? root.description),
            version: text(root.version).slice(0, 100),
            online: false,
            image: firstUrl(root.background_image),
            link
        };
    }
    if (service === 'epic') {
        return {
            title: text(root.title).slice(0, 200),
            description: cleanDescription(root.description ?? root.shortDescription),
            version: text(root.version).slice(0, 100),
            online: false,
            image: epicImage(rawValue),
            link
        };
    }
    return {
        title: text(root.name ?? root.title).slice(0, 200),
        description: cleanDescription(root.overview ?? root.description),
        version: text(root.version).slice(0, 100),
        online: false,
        image: firstUrl(root.image ?? root.background_image),
        link
    };
}

async function ensureContentFolder(folder: string): Promise<(() => Promise<void>) | undefined> {
    if (!folder) return undefined;
    const root = path.resolve(contentDirectory);
    const target = path.resolve(root, folder);
    if (!target.startsWith(`${root}${path.sep}`)) {
        throw new Error('Folder must be inside the content directory');
    }
    const createdPath = await fsp.mkdir(target, { recursive: true });
    if (!createdPath) return undefined;
    return async () => {
        await fsp.rmdir(target).catch(() => undefined);
    };
}

export async function listGames(query: GamesListQuery) {
    const database = await getGamesDatabase();
    const search = query.search?.toLocaleLowerCase();
    const filtered = database
        .all()
        .filter(
            (game) =>
                (!query.service || game.source?.service === query.service) &&
                (!search ||
                    `${game.title} ${game.description} ${game.version} ${game.folder} ${game.source?.service ?? 'local'} ${game.source?.id ?? ''} ${game.status}`
                        .toLocaleLowerCase()
                        .includes(search))
        );

    const page = filtered.slice(query.offset, query.offset + query.limit);
    const sourceVersions = await loadSourceVersions(page);
    const data = page.map((game) => ({
        ...game,
        sourceVersion: sourceVersions.get(game.id) ?? ''
    }));

    return {
        data,
        total: filtered.length,
        limit: query.limit,
        offset: query.offset
    };
}

export type LibraryUpdateResult = {
    service: GameService;
    updated: number;
    added: number;
    total: number;
    errors: string[];
};

async function fetchOwnedGames(service: GameService): Promise<OwnedGame[]> {
    switch (service) {
        case 'steam':
            return (await import('./importers/steam.js')).listSteamOwnedGames();
        case 'rawg':
            return (await import('./importers/rawg.js')).listRawgOwnedGames();
        case 'f95':
            return (await import('./importers/f95.js')).listF95OwnedGames();
        case 'epic':
            return (await import('./importers/epic.js')).listEpicOwnedGames();
    }
}

export async function updateLibrary(service: GameService): Promise<LibraryUpdateResult> {
    const database = await getGamesDatabase();
    const settings = await getSettings();
    const syncVersion =
        service === 'steam'
            ? settings.STEAM_SYNC_VERSION
            : service === 'rawg'
                ? settings.RAWG_SYNC_VERSION
                : service === 'epic'
                    ? settings.EPIC_SYNC_VERSION
                    : settings.F95_SYNC_VERSION;
    const games = database.all().filter((game) => game.source?.service === service);
    const errors: string[] = [];
    let updated = 0;

    // Refresh the metadata of games already present in the catalog.
    for (const game of games) {
        const source = game.source;
        if (!source) continue;
        try {
            const fetched = await fetchSourceRecord(source);
            const sourceDetails = mapSourceDetails(source.service, fetched.raw, fetched.link);
            const next = gameSchema.parse({
                ...game,
                title: sourceDetails.title || game.title,
                description: sourceDetails.description || game.description,
                version: syncVersion ? sourceDetails.version || game.version : game.version,
                online: game.online || sourceDetails.online
            });
            database.upsert(next);
            updated += 1;
        } catch (error) {
            errors.push(
                `${game.title || game.id}: ${error instanceof Error ? error.message : 'Source request failed'}`
            );
        }
    }

    // Discover the games the user owns on the provider and add the missing ones.
    let added = 0;
    const knownSourceIds = new Set(
        games
            .map((game) => game.source?.id)
            .filter((id): id is number | string => id !== undefined)
    );
    try {
        for (const ownedGame of await fetchOwnedGames(service)) {
            if (knownSourceIds.has(ownedGame.id)) continue;
            try {
                const source = { service, id: ownedGame.id };
                const fetched = await fetchSourceRecord(source);
                const sourceDetails = mapSourceDetails(service, fetched.raw, fetched.link);
                const next = gameSchema.parse({
                    id: randomUUID(),
                    title: sourceDetails.title || ownedGame.title,
                    description: sourceDetails.description,
                    version: sourceDetails.version,
                    source,
                    status: 'WantPlay',
                    folder: '',
                    online: sourceDetails.online
                });
                database.upsert(next);
                knownSourceIds.add(ownedGame.id);
                added += 1;
            } catch (error) {
                errors.push(
                    `${ownedGame.title || ownedGame.id}: ${error instanceof Error ? error.message : 'Source request failed'}`
                );
            }
        }
    } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Could not load the owned games list');
    }

    if (updated > 0 || added > 0) await database.save();

    return { service, updated, added, total: games.length, errors };
}

export async function getGame(id: string): Promise<GameRecord | undefined> {
    return (await getGamesDatabase()).get(id);
}

export async function createGame(input: CreateGameInput): Promise<GameRecord | undefined> {
    const database = await getGamesDatabase();
    const id = input.id ?? randomUUID();
    if (database.get(id)) return undefined;
    const source = input.source;
    if (source) {
        const duplicateSource = database.all().some(
            (game) => game.source?.service === source.service && game.source?.id === source.id
        );
        if (duplicateSource) return undefined;
    }

    let sourceDetails: {
        title: string;
        description: string;
        version: string;
        online: boolean;
    };
    if (source) {
        const fetched = await fetchSourceRecord(source);
        sourceDetails = mapSourceDetails(source.service, fetched.raw, fetched.link);
    } else {
        sourceDetails = { title: '', description: '', version: '', online: false };
    }
    const title = input.title?.trim() || sourceDetails.title;
    if (!title && source)
        throw new GameSourceError(
            `The ${source.service} record did not include a game title`
        );
    const game = gameSchema.parse({
        id,
        title,
        description: input.description ?? sourceDetails.description,
        version: input.version ?? sourceDetails.version,
        source: input.source,
        status: input.status,
        folder: input.folder,
        online: input.online || sourceDetails.online
    });
    const rollbackFolder = await ensureContentFolder(game.folder);
    database.upsert(game);
    try {
        await database.save();
    } catch (error) {
        database.delete(game.id);
        await rollbackFolder?.();
        throw error;
    }
    return game;
}

export async function replaceGame(
    id: string,
    input: z.infer<typeof gameFieldsSchema>
): Promise<GameRecord | undefined> {
    const database = await getGamesDatabase();
    const current = database.get(id);
    if (!current) return undefined;
    const game = gameSchema.parse({ ...input, id });
    const rollbackFolder = await ensureContentFolder(game.folder);
    database.upsert(game);
    try {
        await database.save();
    } catch (error) {
        database.upsert(current);
        await rollbackFolder?.();
        throw error;
    }
    return game;
}

export async function patchGame(
    id: string,
    input: Partial<z.infer<typeof gameFieldsSchema>>
): Promise<GameRecord | undefined> {
    const database = await getGamesDatabase();
    const current = database.get(id);
    if (!current) return undefined;
    const game = gameSchema.parse({ ...current, ...input, id });
    const rollbackFolder = await ensureContentFolder(game.folder);
    database.upsert(game);
    try {
        await database.save();
    } catch (error) {
        database.upsert(current);
        await rollbackFolder?.();
        throw error;
    }
    return game;
}

export async function deleteGame(id: string): Promise<boolean> {
    const database = await getGamesDatabase();
    if (!database.delete(id)) return false;
    await database.save();
    return true;
}

export type GameFileEntry = {
    name: string;
    kind: 'file' | 'directory';
};

export type ResolvedGameFile = {
    absolutePath: string;
    contentType: string;
    size: number;
};

const contentTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip'
};

function contentTypeFor(name: string): string {
    return contentTypes[path.extname(name).toLowerCase()] ?? 'application/octet-stream';
}

function resolveGameFolder(game: GameRecord): string | undefined {
    if (!game.folder) return undefined;
    const root = path.resolve(contentDirectory);
    const target = path.resolve(root, game.folder);
    if (!target.startsWith(`${root}${path.sep}`)) {
        throw new Error('Folder must be inside the content directory');
    }
    return target;
}

async function readGameDirectory(target: string): Promise<Dirent[]> {
    try {
        return await fsp.readdir(target, { withFileTypes: true });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw error;
    }
}

/** Lists the first-level files and directories inside the game's content folder. */
export async function listGameFiles(id: string): Promise<GameFileEntry[]> {
    const game = await getGame(id);
    if (!game) return [];
    const target = resolveGameFolder(game);
    if (!target) return [];
    const entries = await readGameDirectory(target);
    return entries
        .map((entry) => ({
            name: entry.name,
            kind: (entry.isDirectory() ? 'directory' : 'file') as GameFileEntry['kind']
        }))
        .sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
        });
}

/**
 * Resolves a file inside the game's content folder for serving. The name may
 * contain subdirectories (e.g. `images/cover.png`) so an HTML page can load its
 * relative media, but is constrained to stay inside the game folder.
 */
export async function resolveGameFile(
    id: string,
    name: string
): Promise<ResolvedGameFile | undefined> {
    const game = await getGame(id);
    if (!game) return undefined;
    const target = resolveGameFolder(game);
    if (!target) return undefined;
    if (!name || name.includes('\\') || name.includes('\0')) return undefined;
    if (name.startsWith('/') || name.split('/').some((segment) => segment === '..')) {
        return undefined;
    }
    const absolutePath = path.resolve(target, name);
    if (absolutePath === target || !absolutePath.startsWith(`${target}${path.sep}`)) {
        return undefined;
    }
    try {
        const stat = await fsp.stat(absolutePath);
        if (!stat.isFile()) return undefined;
        return { absolutePath, contentType: contentTypeFor(name), size: stat.size };
    } catch {
        return undefined;
    }
}

async function loadStoredSourceRecords(
    service: NonNullable<GameRecord['source']>['service']
): Promise<Map<string, { link: string; raw: unknown }>> {
    let parsed: unknown;
    try {
        parsed = JSON.parse(await fsp.readFile(sourceDataFiles[service], 'utf8'));
    } catch {
        return new Map();
    }
    if (!Array.isArray(parsed)) return new Map();
    const records = new Map<string, { link: string; raw: unknown }>();
    for (const entry of parsed) {
        if (!entry || typeof entry !== 'object') continue;
        const record = entry as Record<string, unknown>;
        const id = record.id;
        const link = typeof record.link === 'string' ? record.link : '';
        if ((typeof id === 'string' || typeof id === 'number') && link) {
            records.set(String(id), { link, raw: record.raw });
        }
    }
    return records;
}

/**
 * Resolves the current upstream version for each game from the already-imported
 * source records (steam.json / rawg.json / f95.json / epic.json), reading each
 * service file only once. Used to compare the stored version against the source.
 */
async function loadSourceVersions(
    games: GameRecord[]
): Promise<Map<string, string>> {
    const versions = new Map<string, string>();
    const byService = new Map<NonNullable<GameRecord['source']>['service'], GameRecord[]>();
    for (const game of games) {
        const service = game.source?.service;
        if (!service) continue;
        const group = byService.get(service);
        if (group) group.push(game);
        else byService.set(service, [game]);
    }
    for (const [service, serviceGames] of byService) {
        const records = await loadStoredSourceRecords(service);
        for (const game of serviceGames) {
            const record = records.get(String(game.source!.id));
            if (!record) continue;
            versions.set(game.id, mapSourceDetails(service, record.raw, record.link).version);
        }
    }
    return versions;
}

export type GameMedia = {
    image: string | null;
    link: string | null;
};

const COVER_CANDIDATES = ['cover.png', 'cover.jpg', 'cover.jpeg', 'cover.webp'];

/**
 * Computes the store link and cover image for a game on demand. A local cover
 * image (`cover.png` or a common image variant) inside the game's content folder
 * takes precedence; otherwise the cover comes from the already-imported source
 * record (no network call), so nothing needs to be persisted into games.json.
 */
export async function getGameMedia(id: string): Promise<GameMedia | undefined> {
    const game = await getGame(id);
    if (!game) return undefined;

    const source = game.source;
    let image: string | null = null;
    let link: string | null = null;
    if (source) {
        const record = (await loadStoredSourceRecords(source.service)).get(String(source.id));
        if (record) {
            const details = mapSourceDetails(source.service, record.raw, record.link);
            image = details.image;
            link = details.link;
        }
    }

    // Prefer a cover image placed in the game's own content folder.
    if (game.folder) {
        for (const name of COVER_CANDIDATES) {
            const cover = await resolveGameFile(id, name);
            if (cover) {
                image = `/api/games/${encodeURIComponent(id)}/files/${name}`;
                break;
            }
        }
    }

    return { image, link };
}
