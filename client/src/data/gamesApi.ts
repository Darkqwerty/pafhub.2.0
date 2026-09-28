import type { Game } from '../types/game';

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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(url, {
    ...init,
    headers,
  });
  const serialized: unknown = response.status === 204 ? undefined : await response.json();
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

export async function getGames(): Promise<Game[]> {
  const result = await request<GamesListResponse>('/api/games?limit=200');
  return result.data;
}

export async function updateGame(id: string, changes: Partial<Omit<Game, 'id'>>): Promise<Game> {
  const result = await request<{ data: Game }>(`/api/games/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
  return result.data;
}

export async function createGame(game: CreateGameInput): Promise<Game> {
  const result = await request<{ data: Game }>('/api/games', {
    method: 'POST',
    body: JSON.stringify(game),
  });
  return result.data;
}
