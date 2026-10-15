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
});

export const settingsUpdateSchema = settingsSchema.partial();

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;

const defaultDataFile = fileURLToPath(new URL('../../db/settings.json', import.meta.url));
const dataFile = process.env.SETTINGS_DATA_FILE ?? defaultDataFile;

export function emptySettings(): Settings {
    return { RAWG_API_KEY: '', STEAM_API_KEY: '', STEAM_ID: '', STEAM_LOGIN: '', STEAM_PASSWORD: '' };
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
