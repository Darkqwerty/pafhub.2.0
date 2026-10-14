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
