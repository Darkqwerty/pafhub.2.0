import { randomUUID } from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { JsonDatabase } from './lib/jsondb.js';

export const gameStatusSchema = z.enum(['Completed', 'Uncompleted', 'Played', 'WantPlay']);
export const gameSourceSchema = z.object({
    service: z.enum(['steam', 'rawg', 'f95']),
    id: z.number().int().positive()
});

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

const defaultDataFile = fileURLToPath(new URL('../../games.json', import.meta.url));
const dataFile = process.env.GAMES_DATA_FILE ?? defaultDataFile;
const contentDirectory =
    process.env.CONTENT_DIR ?? fileURLToPath(new URL('../../content/', import.meta.url));
const gamesFileSchema = z.array(gameSchema);

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

async function fetchSourceRecord(source: NonNullable<GameRecord['source']>): Promise<unknown> {
    try {
        switch (source.service) {
            case 'steam':
                return (await (await import('./importers/steam.js')).importSteamGame(source.id))
                    .raw;
            case 'rawg':
                return (await (await import('./importers/rawg.js')).importRawgGame(source.id)).raw;
            case 'f95':
                return (await (await import('./importers/f95.js')).importF95Game(source.id)).raw;
        }
    } catch (error) {
        throw new GameSourceError(error instanceof Error ? error.message : 'Source request failed');
    }
}

function mapSourceDetails(service: NonNullable<GameRecord['source']>['service'], rawValue: unknown) {
    const root = asObject(rawValue);
    if (service === 'steam') {
        const details = asObject(root.data);
        return {
            title: text(details.name).slice(0, 200),
            description: cleanDescription(details.about_the_game ?? details.short_description),
            version: text(details.version).slice(0, 100),
            online: false
        };
    }
    if (service === 'rawg') {
        return {
            title: text(root.name).slice(0, 200),
            description: cleanDescription(root.description_raw ?? root.description),
            version: text(root.version).slice(0, 100),
            online: false
        };
    }
    return {
        title: text(root.name ?? root.title).slice(0, 200),
        description: cleanDescription(root.overview ?? root.description),
        version: text(root.version).slice(0, 100),
        online: false
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
                !search ||
                `${game.title} ${game.description} ${game.version} ${game.folder} ${game.source?.service ?? 'local'} ${game.source?.id ?? ''} ${game.status}`
                    .toLocaleLowerCase()
                    .includes(search)
        );

    return {
        data: filtered.slice(query.offset, query.offset + query.limit),
        total: filtered.length,
        limit: query.limit,
        offset: query.offset
    };
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

    const sourceDetails = source
        ? mapSourceDetails(source.service, await fetchSourceRecord(source))
        : { title: '', description: '', version: '', online: false };
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
