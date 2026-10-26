import { Button, Checkbox, Group, Modal, PasswordInput, TextInput } from '@mantine/core';
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
import type { GameService } from '../types/game';

type SettingsModalProps = {
  opened: boolean;
  onClose: () => void;
  library: GameService;
  onSaved?: (settings: Settings) => void;
};

const libraryNames: Record<GameService, string> = {
  steam: 'Steam',
  epic: 'Epic Games',
  rawg: 'RAWG',
  f95: 'F95',
};

const emptySettings: Settings = {
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
  RAWG_SYNC_VERSION: true,
  F95_SYNC_VERSION: true,
  STEAM_SHOW_VERSION: true,
  EPIC_SHOW_VERSION: true,
  RAWG_SHOW_VERSION: true,
  F95_SHOW_VERSION: true,
};

export function SettingsModal({ opened, onClose, library, onSaved }: SettingsModalProps) {
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
      onSaved?.(saved);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`${libraryNames[library]} settings`} centered>
      <form className="game-editor" onSubmit={save}>
        {loading ? (
          <p className="games-message">Loading settings…</p>
        ) : (
          <>
            {library === 'rawg' ? (
              <>
                <PasswordInput
                  label="RAWG API key"
                  value={draft.RAWG_API_KEY}
                  onChange={(event) => setField('RAWG_API_KEY', event.currentTarget.value)}
                />
                <Checkbox
                  label="Sync version from external service"
                  checked={draft.RAWG_SYNC_VERSION}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, RAWG_SYNC_VERSION: event.currentTarget.checked }))
                  }
                />
                <Checkbox
                  label="Show version column"
                  checked={draft.RAWG_SHOW_VERSION}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, RAWG_SHOW_VERSION: event.currentTarget.checked }))
                  }
                />
              </>
            ) : null}

            {library === 'steam' ? (
              <>
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
                <Checkbox
                  label="Sync version from external service"
                  checked={draft.STEAM_SYNC_VERSION}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, STEAM_SYNC_VERSION: event.currentTarget.checked }))
                  }
                />
                <Checkbox
                  label="Show version column"
                  checked={draft.STEAM_SHOW_VERSION}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, STEAM_SHOW_VERSION: event.currentTarget.checked }))
                  }
                />
              </>
            ) : null}

            {library === 'epic' ? (
              <>
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
                <Checkbox
                  label="Sync version from external service"
                  checked={draft.EPIC_SYNC_VERSION}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, EPIC_SYNC_VERSION: event.currentTarget.checked }))
                  }
                />
                <Checkbox
                  label="Show version column"
                  checked={draft.EPIC_SHOW_VERSION}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, EPIC_SHOW_VERSION: event.currentTarget.checked }))
                  }
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
            ) : null}

            {library === 'f95' ? (
              <>
                <p className="games-message">
                  F95 requires no configuration — thread metadata is imported publicly.
                </p>
                <Checkbox
                  label="Sync version from external service"
                  checked={draft.F95_SYNC_VERSION}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, F95_SYNC_VERSION: event.currentTarget.checked }))
                  }
                />
                <Checkbox
                  label="Show version column"
                  checked={draft.F95_SHOW_VERSION}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, F95_SHOW_VERSION: event.currentTarget.checked }))
                  }
                />
              </>
            ) : null}
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
