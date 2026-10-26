import type { Game, GameService } from '../types/game';

type GamesListResponse = {
  data: Game[];
  total: number;
};

export type CreateGameInput = Pick<Game, 'source' | 'status' | 'folder' | 'online'> &
  Partial<Pick<Game, 'title' | 'description' | 'version'>>;

function unwrapSuperJson<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'json' in payload) {
    return (payload as { json: T }).json;
  }
  return payload as T;
}

// A failed proxy (API container down) or a misrouted request returns the SPA
// `index.html` or an nginx/reverse-proxy error page instead of JSON. Parsing it
// blindly only yields "Unexpected token '<'", so surface what actually came back.
async function readJsonBody(response: Response, url: string): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (text.trim() === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    const contentType = response.headers.get('content-type') ?? 'unknown content type';
    const preview = text.replace(/\s+/g, ' ').trim().slice(0, 80);
    throw new Error(
      `Request to ${url} returned ${contentType} (HTTP ${response.status} ${response.statusText}) instead of JSON. ` +
        'The API is not reachable at this address — check that /api requests are proxied to the server. ' +
        `Response starts with: ${preview}`,
    );
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(url, {
    ...init,
    headers,
  });
  const serialized = await readJsonBody(response, url);
  const payload = unwrapSuperJson<unknown>(serialized);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    if (payload && typeof payload === 'object' && 'error' in payload) {
      message = String((payload as { error: unknown }).error);
      const details = (payload as { details?: unknown }).details;
      if (details && typeof details === 'object' && 'fieldErrors' in details) {
        const fieldErrors = (details as { fieldErrors: Record<string, string[]> }).fieldErrors;
        const messages = Object.entries(fieldErrors).flatMap(([field, errors]) => errors.map((entry) => `${field}: ${entry}`));
        if (messages.length) message += ` — ${messages.join('; ')}`;
      }
    }
    throw new Error(message);
  }

  return payload as T;
}

export async function getGames(service?: GameService): Promise<Game[]> {
  const games: Game[] = [];
  const limit = 200;
  const serviceQuery = service ? `&service=${encodeURIComponent(service)}` : '';
  let offset = 0;
  for (;;) {
    const result = await request<GamesListResponse>(
      `/api/games?limit=${limit}&offset=${offset}${serviceQuery}`,
    );
    games.push(...result.data);
    if (result.data.length < limit) break;
    offset += limit;
  }
  return games;
}

export type GameFileEntry = {
  name: string;
  kind: 'file' | 'directory';
};

export async function getGameFiles(id: string): Promise<GameFileEntry[]> {
  const result = await request<{ data: GameFileEntry[] }>(
    `/api/games/${encodeURIComponent(id)}/files`,
  );
  return result.data;
}

export type GameMedia = {
  image: string | null;
  link: string | null;
};

export async function getGameMedia(id: string): Promise<GameMedia> {
  const result = await request<{ data: GameMedia }>(
    `/api/games/${encodeURIComponent(id)}/media`,
  );
  return result.data;
}

export async function getGameNotes(id: string): Promise<string> {
  const result = await request<{ data: { text: string } }>(
    `/api/games/${encodeURIComponent(id)}/notes`,
  );
  return result.data.text;
}

export async function saveGameNotes(id: string, text: string): Promise<string> {
  const result = await request<{ data: { text: string } }>(
    `/api/games/${encodeURIComponent(id)}/notes`,
    {
      method: 'PUT',
      body: JSON.stringify({ text }),
    },
  );
  return result.data.text;
}

export async function uploadGameCover(id: string, file: File): Promise<string> {
  const url = `/api/games/${encodeURIComponent(id)}/cover`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: await file.arrayBuffer(),
  });
  const serialized = await readJsonBody(response, url);
  const payload = unwrapSuperJson<unknown>(serialized);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    if (payload && typeof payload === 'object' && 'error' in payload) {
      message = String((payload as { error: unknown }).error);
    }
    throw new Error(message);
  }
  return (payload as { data: { name: string } }).data.name;
}

export async function updateGame(id: string, changes: Partial<Omit<Game, 'id'>>): Promise<Game> {
  const result = await request<{ data: Game }>(`/api/games/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
  return result.data;
}

export async function deleteGame(id: string): Promise<void> {
  await request<void>(`/api/games/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function createGame(game: CreateGameInput): Promise<Game> {
  const result = await request<{ data: Game }>('/api/games', {
    method: 'POST',
    body: JSON.stringify(game),
  });
  return result.data;
}

export type LibraryUpdateResult = {
  service: GameService;
  updated: number;
  added: number;
  total: number;
  errors: string[];
};

export async function updateLibrary(service: GameService): Promise<LibraryUpdateResult> {
  const result = await request<{ data: LibraryUpdateResult }>(
    `/api/libraries/${service}/update`,
    { method: 'POST' },
  );
  return result.data;
}
