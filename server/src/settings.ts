import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const settingsSchema = z.object({
    RAWG_API_KEY: z.string(),
    STEAM_API_KEY: z.string(),
    STEAM_ID: z.string().default(''),
    STEAM_LOGIN: z.string(),
    STEAM_PASSWORD: z.string(),
    STEAM_SYNC_VERSION: z.boolean().default(true),
    EPIC_CLIENT_ID: z.string().default(''),
    EPIC_CLIENT_SECRET: z.string().default(''),
    EPIC_ACCOUNT_ID: z.string().default(''),
    EPIC_SYNC_VERSION: z.boolean().default(true),
    EPIC_REFRESH_TOKEN: z.string().default(''),
    RAWG_SYNC_VERSION: z.boolean().default(true),
    F95_SYNC_VERSION: z.boolean().default(true),
    STEAM_SHOW_VERSION: z.boolean().default(true),
    EPIC_SHOW_VERSION: z.boolean().default(true),
    RAWG_SHOW_VERSION: z.boolean().default(true),
    F95_SHOW_VERSION: z.boolean().default(true),
});

export const settingsUpdateSchema = settingsSchema.partial();

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;

/** Settings safe to send to the browser; the Epic refresh token stays server-side. */
export type PublicSettings = Omit<Settings, 'EPIC_REFRESH_TOKEN'>;

export function toPublicSettings(settings: Settings): PublicSettings {
    const { EPIC_REFRESH_TOKEN: _refreshToken, ...rest } = settings;
    return rest;
}

const defaultDataFile = fileURLToPath(new URL('../../db/settings.json', import.meta.url));
const dataFile = process.env.SETTINGS_DATA_FILE ?? defaultDataFile;

export function emptySettings(): Settings {
    return {
        RAWG_API_KEY: '',
        STEAM_API_KEY: '',
        STEAM_ID: '',
        STEAM_LOGIN: '',
        STEAM_PASSWORD: '',
        STEAM_SYNC_VERSION: true,
        EPIC_CLIENT_ID: '',
        EPIC_CLIENT_SECRET: '',
        EPIC_ACCOUNT_ID: '',
        EPIC_SYNC_VERSION: true,
        EPIC_REFRESH_TOKEN: '',
        RAWG_SYNC_VERSION: true,
        F95_SYNC_VERSION: true,
        STEAM_SHOW_VERSION: true,
        EPIC_SHOW_VERSION: true,
        RAWG_SHOW_VERSION: true,
        F95_SHOW_VERSION: true,
    };
}

export async function getSettings(): Promise<Settings> {
    let content: string;
    try {
        content = await fsp.readFile(dataFile, 'utf8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        return emptySettings();
    }
    return settingsSchema.parse(JSON.parse(content));
}

export async function updateSettings(input: SettingsUpdate): Promise<Settings> {
    const current = await getSettings();
    const next = settingsSchema.parse({ ...current, ...input });
    await fsp.mkdir(path.dirname(dataFile), { recursive: true });

    const temporaryPath = `${dataFile}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
        await fsp.writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
        await fsp.rename(temporaryPath, dataFile);
    } catch (error) {
        await fsp.rm(temporaryPath, { force: true }).catch(() => undefined);
        throw error;
    }
    return next;
}
