import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { getSettings, updateSettings } from '../settings.js';
import { JsonDatabase } from '../lib/jsondb.js';
import type { OwnedGame } from './types.js';

/**
 * Epic Games does not publish a public "owned games" API. This adapter talks to
 * the same private services the Epic Games Launcher and the open-source
 * Legendary/Heroic launchers use: an OAuth login against the launcher client,
 * the launcher assets endpoint for the installed/owned library, and the catalog
 * service for game metadata.
 *
 * These endpoints are undocumented and may change without notice.
 */

const EPIC_OAUTH_HOST = 'account-public-service-prod03.ol.epicgames.com';
const EPIC_LAUNCHER_HOST = 'launcher-public-service-prod06.ol.epicgames.com';
const EPIC_CATALOG_HOST = 'catalog-public-service-prod06.ol.epicgames.com';

const EPIC_USER_AGENT =
    'UELauncher/11.0.1-14907503+++Portal+Release-Live Windows/10.0.19041.1.256.64bit';
const EPIC_REQUEST_TIMEOUT_MS = 20_000;

const epicRecordSchema = z.object({
    id: z.string().min(1),
    link: z.string().url(),
    raw: z.unknown(),
    importedAt: z.string().datetime(),
});

const epicFileSchema = z.array(epicRecordSchema);

const epicTokenSchema = z
    .object({
        access_token: z.string().min(1),
        refresh_token: z.string().min(1).optional(),
        account_id: z.string().min(1).optional(),
        expires_in: z.number().optional(),
    })
    .passthrough();

const epicAssetSchema = z
    .object({
        appName: z.string().optional(),
        namespace: z.string().optional(),
        catalogItemId: z.string().optional(),
    })
    .passthrough();

const epicIdPattern = /^([^:\s]+):([^:\s]+)$/;

export type EpicRecord = z.infer<typeof epicRecordSchema>;
type EpicToken = z.infer<typeof epicTokenSchema>;

const defaultDataFile = fileURLToPath(new URL('../../../db/epic.json', import.meta.url));

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

/**
 * Resolves the OAuth client used for Epic authentication. Both values are set
 * in the Settings dialog and stored in db/settings.json.
 */
async function getEpicClientCredentials(): Promise<{ clientId: string; clientSecret: string }> {
    const settings = await getSettings();
    const clientId = settings.EPIC_CLIENT_ID.trim();
    const clientSecret = settings.EPIC_CLIENT_SECRET.trim();
    if (!clientId || !clientSecret) {
        throw new Error('Epic client ID and secret are not configured; set them in Settings');
    }
    return { clientId, clientSecret };
}

/** Login URL to open in a browser; its JSON response contains `authorizationCode`. */
export async function getEpicAuthUrl(): Promise<string> {
    const { clientId } = await getEpicClientCredentials();
    const redirect = `https://www.epicgames.com/id/api/redirect?clientId=${clientId}&responseType=code`;
    return `https://www.epicgames.com/id/login?redirectUrl=${encodeURIComponent(redirect)}`;
}

function describeEpicError(payload: unknown): string {
    if (payload && typeof payload === 'object') {
        const root = payload as Record<string, unknown>;
        if (
            root.errorCode === 'errors.com.epicgames.oauth.corrective_action_required' &&
            typeof root.continuationUrl === 'string'
        ) {
            return `account action required, open ${root.continuationUrl}`;
        }
        const message = root.errorMessage ?? root.message ?? root.error;
        if (typeof message === 'string' && message.trim()) return message.trim();
    }
    return '';
}

async function requestEpicToken(params: Record<string, string>): Promise<EpicToken> {
    const { clientId, clientSecret } = await getEpicClientCredentials();
    const response = await fetch(`https://${EPIC_OAUTH_HOST}/account/api/oauth/token`, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'user-agent': EPIC_USER_AGENT,
        },
        body: new URLSearchParams({ ...params, token_type: 'eg1' }),
        signal: AbortSignal.timeout(EPIC_REQUEST_TIMEOUT_MS),
    });

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
        const detail = describeEpicError(payload);
        throw new Error(
            `Epic authentication failed (HTTP ${response.status})${detail ? `: ${detail}` : ''}`,
        );
    }

    return epicTokenSchema.parse(payload);
}

async function persistEpicSession(token: EpicToken): Promise<void> {
    const changes: { EPIC_REFRESH_TOKEN?: string; EPIC_ACCOUNT_ID?: string } = {};
    // Epic rotates refresh tokens, so always persist the newest one.
    if (token.refresh_token) changes.EPIC_REFRESH_TOKEN = token.refresh_token;
    if (token.account_id) changes.EPIC_ACCOUNT_ID = token.account_id;
    if (Object.keys(changes).length) await updateSettings(changes);
}

function cacheToken(token: EpicToken): void {
    const lifetimeSeconds = Math.max(60, (token.expires_in ?? 3600) - 120);
    cachedToken = {
        accessToken: token.access_token,
        expiresAt: Date.now() + lifetimeSeconds * 1000,
    };
}

async function getEpicAccessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.accessToken;

    const settings = await getSettings();
    const refreshToken = settings.EPIC_REFRESH_TOKEN.trim();
    if (!refreshToken) {
        throw new Error(
            'Epic account is not connected; open Settings and authorize your Epic account first',
        );
    }

    const token = await requestEpicToken({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });
    await persistEpicSession(token);
    cacheToken(token);
    return token.access_token;
}

/** Exchanges an authorization code from the Epic login page and stores the session. */
export async function connectEpicAccount(code: string): Promise<{ accountId: string }> {
    const trimmed = code.trim();
    if (!trimmed) throw new Error('An Epic authorization code is required');

    const token = await requestEpicToken({ grant_type: 'authorization_code', code: trimmed });
    await persistEpicSession(token);
    cacheToken(token);

    if (!token.account_id) {
        throw new Error('Epic did not return an account ID for the authorization code');
    }
    return { accountId: token.account_id };
}

/** Clears the stored Epic session. */
export async function disconnectEpicAccount(): Promise<void> {
    cachedToken = null;
    await updateSettings({ EPIC_REFRESH_TOKEN: '', EPIC_ACCOUNT_ID: '' });
}

async function epicGet(url: URL, token: string): Promise<Response> {
    const response = await fetch(url, {
        headers: { authorization: `bearer ${token}`, 'user-agent': EPIC_USER_AGENT },
        signal: AbortSignal.timeout(EPIC_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error(
                'Epic rejected the access token (HTTP 401); reconnect your Epic account in Settings',
            );
        }
        throw new Error(`Epic returned HTTP ${response.status} for ${url.pathname}`);
    }
    return response;
}

/**
 * Lists the games owned by the connected Epic account. Uses the launcher assets
 * endpoint (the same source as `legendary list`); Unreal Engine content
 * (namespace `ue`) is skipped. Titles are resolved later from the catalog.
 */
export async function listEpicOwnedGames(): Promise<OwnedGame[]> {
    const token = await getEpicAccessToken();
    const url = new URL(`https://${EPIC_LAUNCHER_HOST}/launcher/api/public/assets/Windows`);
    url.searchParams.set('label', 'Live');

    const response = await epicGet(url, token);
    const assets = z.array(epicAssetSchema).parse(await response.json());

    const owned = new Map<string, OwnedGame>();
    for (const asset of assets) {
        const namespace = asset.namespace?.trim();
        const catalogItemId = asset.catalogItemId?.trim();
        if (!namespace || !catalogItemId || namespace === 'ue') continue;
        const id = `${namespace}:${catalogItemId}`;
        if (!owned.has(id)) owned.set(id, { id, title: asset.appName?.trim() ?? '' });
    }

    if (owned.size === 0) {
        throw new Error('Epic returned no owned games; verify that your Epic account is connected');
    }
    return [...owned.values()];
}

function parseEpicId(input: string | number): { namespace: string; catalogItemId: string } {
    const value = String(input).trim();
    const match = epicIdPattern.exec(value);
    if (!match) {
        throw new Error(`Epic source ID must look like "namespace:catalogItemId" (got "${value}")`);
    }
    return { namespace: match[1], catalogItemId: match[2] };
}

function epicStoreLink(raw: unknown): string {
    const item = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const slug =
        (typeof item.productSlug === 'string' && item.productSlug) ||
        (typeof item.urlSlug === 'string' && item.urlSlug) ||
        '';
    const clean = String(slug)
        .replace(/\/(home|purchase|overview)$/i, '')
        .replace(/^\/+|\/+$/g, '');
    return clean ? `https://store.epicgames.com/en-US/p/${clean}` : 'https://store.epicgames.com/';
}

/**
 * Imports one Epic catalog item identified as `namespace:catalogItemId` and
 * inserts or replaces its record in epic.json.
 */
export async function importEpicGame(
    idInput: string | number,
    filePath = process.env.EPIC_DATA_FILE ?? defaultDataFile,
): Promise<EpicRecord> {
    const { namespace, catalogItemId } = parseEpicId(idInput);
    const id = `${namespace}:${catalogItemId}`;
    const token = await getEpicAccessToken();

    const url = new URL(
        `https://${EPIC_CATALOG_HOST}/catalog/api/shared/namespace/${encodeURIComponent(namespace)}/bulk/items`,
    );
    url.searchParams.set('id', catalogItemId);
    url.searchParams.set('includeDLCDetails', 'true');
    url.searchParams.set('includeMainGameDetails', 'true');
    url.searchParams.set('country', 'US');
    url.searchParams.set('locale', 'en');

    const response = await epicGet(url, token);
    const items = z.record(z.string(), z.unknown()).parse(await response.json());
    const raw = items[catalogItemId];
    if (raw === undefined) {
        throw new Error(`Epic did not return catalog details for ${id}`);
    }

    const record: EpicRecord = {
        id,
        link: epicStoreLink(raw),
        raw,
        importedAt: new Date().toISOString(),
    };

    const database = await JsonDatabase.open(filePath, epicFileSchema);
    database.upsert(record);
    await database.save();
    return record;
}

async function runCli(): Promise<void> {
    const ids = process.argv.slice(2);
    if (ids.length === 0) {
        throw new Error('Usage: npm run import:epic -- <namespace:catalogItemId> [more ...]');
    }

    for (const id of ids) {
        const record = await importEpicGame(id);
        console.log(`Imported Epic item ${record.id} at ${record.importedAt}`);
    }
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(path.resolve(entryPath)).href) {
    runCli().catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
