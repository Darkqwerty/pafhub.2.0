import { Button, Modal, PasswordInput, TextInput } from '@mantine/core';
import { useEffect, useState, type FormEvent } from 'react';
import { getSettings, updateSettings } from '../data/settingsApi';
import type { Settings } from '../types/settings';

type SettingsModalProps = {
  opened: boolean;
  onClose: () => void;
};

const emptySettings: Settings = {
  RAWG_API_KEY: '',
  STEAM_API_KEY: '',
  STEAM_ID: '',
  STEAM_LOGIN: '',
  STEAM_PASSWORD: '',
};

export function SettingsModal({ opened, onClose }: SettingsModalProps) {
  const [draft, setDraft] = useState<Settings>(emptySettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    let active = true;
    setLoading(true);
    setError(null);
    getSettings()
      .then((settings) => {
        if (active) setDraft(settings);
      })
      .catch((failure: unknown) => {
        if (active) setError(failure instanceof Error ? failure.message : 'Could not load settings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [opened]);

  const setField = (field: keyof Settings, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await updateSettings(draft);
      setDraft(saved);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Settings" centered>
      <form className="game-editor" onSubmit={save}>
        {loading ? (
          <p className="games-message">Loading settings…</p>
        ) : (
          <>
            <PasswordInput
              label="RAWG API key"
              value={draft.RAWG_API_KEY}
              onChange={(event) => setField('RAWG_API_KEY', event.currentTarget.value)}
            />
            <PasswordInput
              label="Steam API key"
              value={draft.STEAM_API_KEY}
              onChange={(event) => setField('STEAM_API_KEY', event.currentTarget.value)}
            />
            <TextInput
              label="Steam ID"
              description="17-digit SteamID64 used to list your owned games."
              value={draft.STEAM_ID}
              onChange={(event) => setField('STEAM_ID', event.currentTarget.value)}
            />
            <TextInput
              label="Steam login"
              value={draft.STEAM_LOGIN}
              onChange={(event) => setField('STEAM_LOGIN', event.currentTarget.value)}
            />
            <PasswordInput
              label="Steam password"
              value={draft.STEAM_PASSWORD}
              onChange={(event) => setField('STEAM_PASSWORD', event.currentTarget.value)}
            />
          </>
        )}
        {error ? (
          <p className="games-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="game-editor-actions">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={loading}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
