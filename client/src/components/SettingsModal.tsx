import { Button, Divider, Group, Modal, PasswordInput, TextInput } from '@mantine/core';
import { useEffect, useState, type FormEvent } from 'react';
import { HintButton } from './HintButton';
import {
  connectEpicAccount,
  disconnectEpicAccount,
  getEpicAuthUrl,
  getSettings,
  updateSettings,
} from '../data/settingsApi';
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
  EPIC_CLIENT_ID: '',
  EPIC_CLIENT_SECRET: '',
  EPIC_ACCOUNT_ID: '',
};

export function SettingsModal({ opened, onClose }: SettingsModalProps) {
  const [draft, setDraft] = useState<Settings>(emptySettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epicCode, setEpicCode] = useState('');
  const [epicBusy, setEpicBusy] = useState(false);
  const [epicMessage, setEpicMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    let active = true;
    setLoading(true);
    setError(null);
    setEpicMessage(null);
    setEpicCode('');
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

  const startEpicAuth = async () => {
    setEpicMessage(null);
    try {
      const url = await getEpicAuthUrl();
      window.open(url, '_blank', 'noopener,noreferrer');
      setEpicMessage(
        'Sign in on the Epic page, then paste the "authorizationCode" value from the JSON response below.',
      );
    } catch (failure) {
      setEpicMessage(failure instanceof Error ? failure.message : 'Could not start Epic login');
    }
  };

  const submitEpicCode = async () => {
    setEpicBusy(true);
    setEpicMessage(null);
    try {
      const { accountId } = await connectEpicAccount(epicCode);
      setDraft((current) => ({ ...current, EPIC_ACCOUNT_ID: accountId }));
      setEpicCode('');
      setEpicMessage('Epic account connected.');
    } catch (failure) {
      setEpicMessage(failure instanceof Error ? failure.message : 'Could not connect Epic account');
    } finally {
      setEpicBusy(false);
    }
  };

  const disconnect = async () => {
    setEpicBusy(true);
    setEpicMessage(null);
    try {
      await disconnectEpicAccount();
      setDraft((current) => ({ ...current, EPIC_ACCOUNT_ID: '' }));
      setEpicMessage('Epic account disconnected.');
    } catch (failure) {
      setEpicMessage(
        failure instanceof Error ? failure.message : 'Could not disconnect Epic account',
      );
    } finally {
      setEpicBusy(false);
    }
  };

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

            <Divider label="Epic Games" labelPosition="left" my="xs" />
            <TextInput
              label="Epic client ID"
              description="OAuth client used for Epic login. Defaults to the Epic Games Launcher client."
              value={draft.EPIC_CLIENT_ID}
              onChange={(event) => setField('EPIC_CLIENT_ID', event.currentTarget.value)}
            />
            <PasswordInput
              label="Epic client secret"
              description="OAuth client secret. Change only when using your own Epic client."
              value={draft.EPIC_CLIENT_SECRET}
              onChange={(event) => setField('EPIC_CLIENT_SECRET', event.currentTarget.value)}
            />
            <TextInput
              label="Epic account ID"
              description="Filled in automatically once you authorize below."
              value={draft.EPIC_ACCOUNT_ID}
              readOnly
            />
            <Group gap="xs">
              <Button type="button" variant="default" onClick={startEpicAuth} disabled={epicBusy}>
                Open Epic login
              </Button>
              <Button
                type="button"
                variant="default"
                color="red"
                onClick={disconnect}
                disabled={epicBusy || !draft.EPIC_ACCOUNT_ID}
              >
                Disconnect
              </Button>
            </Group>
            <TextInput
              label="Authorization code"
              description="Paste the authorizationCode returned by the Epic login page."
              value={epicCode}
              onChange={(event) => setEpicCode(event.currentTarget.value)}
            />
            <Button
              type="button"
              variant="light"
              onClick={submitEpicCode}
              disabled={epicBusy || !epicCode.trim()}
            >
              {epicBusy ? 'Connecting…' : 'Connect Epic account'}
            </Button>
            {epicMessage ? <p className="games-message">{epicMessage}</p> : null}
          </>
        )}
        {error ? (
          <p className="games-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="game-editor-actions">
          <HintButton keyLabel="Esc" onClick={onClose} disabled={saving}>
            Cancel
          </HintButton>
          <HintButton keyLabel="s" type="submit" disabled={loading || saving}>
            {saving ? 'Saving…' : 'Save'}
          </HintButton>
        </div>
      </form>
    </Modal>
  );
}
