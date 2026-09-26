import type { Game } from '../types/game';

type GamesListResponse = {
  data: Game[];
  total: number;
};

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
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : `Request failed (${response.status})`;
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
