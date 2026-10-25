import { request } from './gamesApi';
import type { Settings } from '../types/settings';

export async function getSettings(): Promise<Settings> {
  const result = await request<{ data: Settings }>('/api/settings');
  return result.data;
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  const result = await request<{ data: Settings }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return result.data;
}

export async function getEpicAuthUrl(): Promise<string> {
  const result = await request<{ data: { url: string } }>('/api/epic/auth');
  return result.data.url;
}

export async function connectEpicAccount(code: string): Promise<{ accountId: string }> {
  const result = await request<{ data: { accountId: string } }>('/api/epic/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return result.data;
}

export async function disconnectEpicAccount(): Promise<void> {
  await request<{ data: { connected: boolean } }>('/api/epic/auth', { method: 'DELETE' });
}
