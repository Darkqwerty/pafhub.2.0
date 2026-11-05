import {
    Checkbox,
    Modal,
    Select,
    TextInput,
    Textarea,
    Tooltip
} from '@mantine/core';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { FilesPanel } from './FilesPanel';
import { GameCard } from './GameCard';
import { HintButton } from './HintButton';
import { SettingsModal } from './SettingsModal';
import { useBlockAvailability, useBlockKeys, useTerminal } from '../terminal/TerminalContext';
import { createGame, deleteGame, getGames, updateGame } from '../data/gamesApi';
import type { CreateGameInput } from '../data/gamesApi';
import { getSettings } from '../data/settingsApi';
import type { Settings } from '../types/settings';
import type { Game, GameService, GameServiceFilter, GameStatus } from '../types/game';

type PopularGamesProps = {
    games: Game[];
    loading: boolean;
    error: string | null;
    onGameUpdated: (game: Game) => void;
    onGameCreated: (game: Game) => void;
    onGameDeleted: (id: string) => void;
    library: GameServiceFilter;
    updatingLibrary: boolean;
    onUpdateLibrary: () => void;
    libraryUpdateMessage: { kind: 'success' | 'error'; text: string } | null;
    selectGameId: string | null;
    onSelectGameHandled: () => void;
};

const statusOptions = ['Completed', 'Uncompleted', 'Played', 'WantPlay'];
const serviceOptions = [
    { value: 'local', label: 'Local game' },
    { value: 'steam', label: 'Steam' },
    { value: 'epic', label: 'Epic Games' },
    { value: 'rawg', label: 'RAWG' },
    { value: 'f95', label: 'F95' }
];

const libraryNames: Record<GameServiceFilter, string> = {
    local: 'Local',
    steam: 'Steam',
    epic: 'Epic Games',
    rawg: 'RAWG',
    f95: 'F95'
};

const showVersionKey: Record<GameService, keyof Settings> = {
    steam: 'STEAM_SHOW_VERSION',
    epic: 'EPIC_SHOW_VERSION',
    rawg: 'RAWG_SHOW_VERSION',
    f95: 'F95_SHOW_VERSION'
};

const epicSourceIdPattern = /^[^:\s]+:[^:\s]+$/;

/** Epic identifies records as `namespace:catalogItemId`; the other providers use numeric IDs. */
function isValidSourceId(source: Game['source']): boolean {
    if (!source) return true;
    if (source.service === 'epic') {
        return typeof source.id === 'string' && epicSourceIdPattern.test(source.id.trim());
    }
    return typeof source.id === 'number' && Number.isInteger(source.id) && source.id >= 1;
}

type SortId = 'title' | 'description' | 'status';
const sortColumns: Array<{ id: SortId; label: string }> = [
    { id: 'title', label: 'Game' },
    { id: 'description', label: 'Description' },
    { id: 'status', label: 'Status' }
];

export default function PopularGames({
    games,
    loading,
    error,
    onGameUpdated,
    onGameCreated,
    onGameDeleted,
    library,
    updatingLibrary,
    onUpdateLibrary,
    libraryUpdateMessage,
    selectGameId,
    onSelectGameHandled
}: PopularGamesProps) {
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [draft, setDraft] = useState<Game | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [deletingGame, setDeletingGame] = useState<Game | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [sorting, setSorting] = useState<{ id: SortId; desc: boolean }>({ id: 'title', desc: false });
    const [sortOpen, setSortOpen] = useState(false);
    const [sortCursor, setSortCursor] = useState(0);
    const { activeBlock } = useTerminal();
    const gamesActive = activeBlock === 'games';
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [searchEverywhere, setSearchEverywhere] = useState(false);
    const [allGames, setAllGames] = useState<Game[] | null>(null);
    const [mediaNonce, setMediaNonce] = useState(0);
    const tableContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let active = true;
        getSettings()
            .then((loaded) => {
                if (active) setSettings(loaded);
            })
            .catch(() => {
                if (active) setSettings(null);
            });
        return () => {
            active = false;
        };
    }, []);

    // Load every service's games once when "search everywhere" is first enabled.
    useEffect(() => {
        if (!searchEverywhere || allGames !== null) return;
        let active = true;
        getGames()
            .then((records) => {
                if (active) setAllGames(records);
            })
            .catch(() => {
                if (active) setAllGames([]);
            });
        return () => {
            active = false;
        };
    }, [searchEverywhere, allGames]);

    const startEdit = useCallback((game: Game) => {
        setEditingGame(game);
        setDraft({ ...game, source: game.source ? { ...game.source } : null });
        setSaveError(null);
    }, []);

    const startDelete = useCallback((game: Game) => {
        setDeletingGame(game);
        setDeleteError(null);
    }, []);

    // Sorting is driven by the s:Sort menu above the table, so the rendered
    // order and the default selection always agree.
    const displayGames = useMemo(() => {
        const base = searchEverywhere ? (allGames ?? games) : games;
        const search = query.trim().toLowerCase();
        const filtered = search
            ? base.filter((game) =>
                  `${game.title} ${game.description} ${game.version} ${game.folder} ${game.source?.service ?? 'local'} ${game.source?.id ?? ''} ${game.status}`
                      .toLowerCase()
                      .includes(search))
            : base;
        const sorted = [...filtered].sort((a, b) => {
            const left = String(a[sorting.id]).toLowerCase();
            const right = String(b[sorting.id]).toLowerCase();
            return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });
        });
        return sorting.desc ? sorted.reverse() : sorted;
    }, [games, allGames, searchEverywhere, query, sorting]);

    const chooseSort = (id: SortId) => {
        setSorting((current) => (current.id === id ? { id, desc: !current.desc } : { id, desc: false }));
        setSortOpen(false);
    };

    // Keep a valid selection as the (filtered) list changes; default to the
    // first rendered row.
    useEffect(() => {
        setSelectedId((current) => {
            if (current && displayGames.some((game) => game.id === current)) return current;
            return displayGames[0]?.id ?? null;
        });
    }, [displayGames]);

    // When a game is requested from outside (e.g. the random-game block), clear
    // any active search so the game is visible, select it, then scroll the list
    // so the selected row is in view.
    useEffect(() => {
        if (!selectGameId) return;
        setQuery('');
        setSearchEverywhere(false);
        const index = displayGames.findIndex((game) => game.id === selectGameId);
        if (index === -1) return;
        setSelectedId(selectGameId);
        tableContainerRef.current
            ?.querySelector(`tr[data-index="${index}"]`)
            ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        onSelectGameHandled();
    }, [selectGameId, displayGames, onSelectGameHandled]);

    const selectedGame = useMemo(
        () => displayGames.find((game) => game.id === selectedId) ?? null,
        [displayGames, selectedId]
    );

    const showVersionColumn = library === 'local' ? true : settings ? settings[showVersionKey[library]] : true;

    const columns = useMemo<MRT_ColumnDef<Game>[]>(() => {
        const result: MRT_ColumnDef<Game>[] = [{ accessorKey: 'title', header: 'GAME', size: 320 }];
        if (showVersionColumn) {
            result.push({
                accessorKey: 'version',
                header: 'VERSION',
                size: 320,
                Cell: ({ row }) => {
                    const local = row.original.version.trim();
                    const source = (row.original.sourceVersion ?? '').trim();
                    const differs = Boolean(local && source && local !== source);
                    return (
                        <span className={differs ? 'version-mismatch' : undefined}>
                            {local || '—'}
                            {source ? ` (${source})` : ''}
                        </span>
                    );
                }
            });
        }
        result.push(
            {
                accessorKey: 'description',
                header: 'DESCRIPTION',
                size: 640,
                Cell: ({ cell }) => {
                    const description = cell.getValue<string>();
                    return (
                        <Tooltip
                            label={description || 'No description'}
                            multiline
                            maw={560}
                            disabled={!description}
                        >
                            <div className="description-cell">{description || '—'}</div>
                        </Tooltip>
                    );
                }
            },
            {
                accessorKey: 'status',
                header: 'STATUS',
                size: 130,
                Cell: ({ cell }) => {
                    const status = cell.getValue<GameStatus>();
                    return <span className={`status-text status-${status.toLowerCase()}`}>{status}</span>;
                }
            }
        );
        return result;
    }, [showVersionColumn]);

    const closeEditor = () => {
        if (!saving) {
            setEditingGame(null);
            setDraft(null);
            setCreating(false);
        }
    };

    const openCreateForm = () => {
        setEditingGame(null);
        setDraft({
            id: '',
            title: '',
            description: '',
            version: '',
            source: null,
            status: 'WantPlay',
            folder: '',
            online: false
        });
        setSaveError(null);
        setCreating(true);
    };

    const saveGame = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!draft) return;
        setSaving(true);
        setSaveError(null);
        try {
            if (creating) {
                const createInput: CreateGameInput = {
                    source: draft.source,
                    status: draft.status,
                    folder: draft.folder,
                    online: draft.online,
                    ...(draft.title.trim() ? { title: draft.title.trim() } : {}),
                    ...(draft.description ? { description: draft.description } : {}),
                    ...(draft.version ? { version: draft.version } : {})
                };
                const created = await createGame(createInput);
                onGameCreated(created);
            } else if (editingGame) {
                const { id, ...changes } = draft;
                const updated = await updateGame(id, changes);
                onGameUpdated(updated);
            }
            setEditingGame(null);
            setDraft(null);
            setCreating(false);
        } catch (saveFailure) {
            setSaveError(
                saveFailure instanceof Error ? saveFailure.message : 'Could not save changes'
            );
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deletingGame) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await deleteGame(deletingGame.id);
            onGameDeleted(deletingGame.id);
            setDeletingGame(null);
        } catch (failure) {
            setDeleteError(failure instanceof Error ? failure.message : 'Could not delete game');
        } finally {
            setDeleting(false);
        }
    };

    useBlockAvailability('games', true);

    useBlockKeys('games', (event) => {
        const key = event.key;

        // Esc (or the sort key again) dismisses the sort menu.
        if (sortOpen) {
            if (key === 'Escape' || key.toLowerCase() === 's') {
                event.preventDefault();
                setSortOpen(false);
            } else if (key === 'ArrowDown') {
                event.preventDefault();
                setSortCursor((cursor) => (cursor + 1) % sortColumns.length);
            } else if (key === 'ArrowUp') {
                event.preventDefault();
                setSortCursor((cursor) => (cursor - 1 + sortColumns.length) % sortColumns.length);
            } else if (key === 'Enter') {
                event.preventDefault();
                chooseSort(sortColumns[sortCursor].id);
            }
            return;
        }

        if (key === 'ArrowDown') {
            event.preventDefault();
            if (displayGames.length === 0) return;
            const index = selectedId ? displayGames.findIndex((game) => game.id === selectedId) : -1;
            const nextIndex = Math.min(index + 1, displayGames.length - 1);
            const next = displayGames[nextIndex];
            if (next) setSelectedId(next.id);
            return;
        }
        if (key === 'ArrowUp') {
            event.preventDefault();
            if (displayGames.length === 0) return;
            const index = selectedId
                ? displayGames.findIndex((game) => game.id === selectedId)
                : displayGames.length;
            const prevIndex = Math.max((index <= 0 ? displayGames.length : index) - 1, 0);
            const prev = displayGames[prevIndex];
            if (prev) setSelectedId(prev.id);
            return;
        }

        const lower = key.toLowerCase();
        if (key === '/') {
            event.preventDefault();
            setSearchOpen(true);
            return;
        }
        if (lower === 's') {
            event.preventDefault();
            setSortCursor(0);
            setSortOpen((open) => !open);
            return;
        }
        if (lower === 'u' && library !== 'local' && !updatingLibrary) {
            event.preventDefault();
            onUpdateLibrary();
            return;
        }
        if (lower === 'a') {
            event.preventDefault();
            openCreateForm();
            return;
        }
        if (lower === 'p' && library !== 'local') {
            event.preventDefault();
            setSettingsOpen(true);
            return;
        }
    });

    // Keep the arrow-selected row in view while the games block is focused.
    useEffect(() => {
        if (!gamesActive) return;
        const index = displayGames.findIndex((game) => game.id === selectedId);
        if (index === -1) return;
        tableContainerRef.current
            ?.querySelector(`tr[data-index="${index}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [selectedId, gamesActive, displayGames]);

    return (
        <section className="catalog-section">
            <div className="catalog-body">
                <div className={`games-frame term-block ${gamesActive ? 'is-active' : ''}`}>
                    <header className="frame-header">
                        <span className="frame-title">[2] GAMES</span>
                        <div className="frame-actions">
                            <HintButton keyLabel="/" compact title="Search games" onClick={() => setSearchOpen(true)}>
                                Search
                            </HintButton>
                            <div className="sort-control">
                                <HintButton keyLabel="s" compact title="Sort by column" onClick={() => setSortOpen((open) => !open)}>
                                    Sort
                                </HintButton>
                                {sortOpen ? (
                                    <>
                                        <div className="sort-backdrop" onClick={() => setSortOpen(false)} />
                                        <div className="sort-menu" role="menu">
                                            {sortColumns.map((column, index) => {
                                                const active = sorting.id === column.id;
                                                const cursor = sortCursor === index;
                                                return (
                                                    <button
                                                        key={column.id}
                                                        type="button"
                                                        role="menuitemradio"
                                                        aria-checked={active}
                                                        className={`sort-item${active ? ' active' : ''}${cursor ? ' sort-cursor' : ''}`}
                                                        onClick={() => chooseSort(column.id)}
                                                    >
                                                        <span>{column.label}</span>
                                                        <span className="sort-dir">{active ? (sorting.desc ? '▼' : '▲') : ''}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : null}
                            </div>
                            {library !== 'local' ? (
                                <HintButton
                                    keyLabel="u"
                                    compact
                                    title={`Update ${library} library`}
                                    disabled={updatingLibrary}
                                    onClick={onUpdateLibrary}
                                >
                                    {updatingLibrary ? 'Updating…' : 'Update library'}
                                </HintButton>
                            ) : null}
                            <HintButton keyLabel="a" compact title="Add game" onClick={openCreateForm}>
                                Add game
                            </HintButton>
                            {library !== 'local' ? (
                                <HintButton keyLabel="p" compact title={`${libraryNames[library]} settings`} onClick={() => setSettingsOpen(true)}>
                                    Settings
                                </HintButton>
                            ) : null}
                        </div>
                    </header>
                    {libraryUpdateMessage ? (
                        <p
                            className={`games-message ${libraryUpdateMessage.kind === 'error' ? 'games-error' : ''}`}
                            role={libraryUpdateMessage.kind === 'error' ? 'alert' : 'status'}
                        >
                            {libraryUpdateMessage.text}
                        </p>
                    ) : null}
                    {error ? (
                        <p className="games-message games-error" role="alert">
                            Could not load games: {error}
                        </p>
                    ) : null}
                    {!error && !loading && games.length === 0 ? (
                        <p className="games-message">No games found in games.json.</p>
                    ) : null}
                    <div className="table-wrap">
                        <MantineReactTable
                            columns={columns}
                            data={displayGames}
                            getRowId={(game) => game.id}
                            state={{ isLoading: loading, showProgressBars: loading }}
                            enableTopToolbar={false}
                            enableBottomToolbar={false}
                            enableColumnActions={false}
                            enableColumnFilters={false}
                            enablePagination={false}
                            enableDensityToggle={false}
                            enableFullScreenToggle={false}
                            enableHiding={false}
                            enableSorting={false}
                            enableStickyHeader
                            mantineTableContainerProps={{ ref: tableContainerRef }}
                            mantineTableProps={{ striped: false, highlightOnHover: true }}
                            mantineTableBodyRowProps={({ row }) => ({
                                onClick: () => setSelectedId(row.id),
                                className: row.id === selectedId ? 'row-selected' : undefined,
                                style: { cursor: 'pointer' }
                            })}
                            mantinePaperProps={{ shadow: 'none' }}
                        />
                    </div>
                </div>
                <div className="detail-column">
                    <GameCard
                        game={selectedGame}
                        onEdit={startEdit}
                        onDelete={startDelete}
                        mediaNonce={mediaNonce}
                    />
                    <FilesPanel
                        game={selectedGame}
                        onCoverUploaded={() => setMediaNonce((n) => n + 1)}
                    />
                </div>
            </div>

            <Modal
                opened={(editingGame !== null || creating) && draft !== null}
                onClose={closeEditor}
                title={creating ? 'Add game' : 'Edit game'}
                centered
            >
                {draft ? (
                    <form className="game-editor" onSubmit={saveGame}>
                        <TextInput
                            label={creating && draft.source ? 'Title override (optional)' : 'Title'}
                            value={draft.title}
                            onChange={(event) =>
                                setDraft({ ...draft, title: event.currentTarget.value })
                            }
                            required={!creating || !draft.source}
                            maxLength={200}
                            autoFocus
                        />
                        <Textarea
                            label={
                                creating && draft.source
                                    ? 'Description override (optional)'
                                    : 'Description'
                            }
                            value={draft.description}
                            onChange={(event) =>
                                setDraft({ ...draft, description: event.currentTarget.value })
                            }
                            maxLength={5000}
                            autosize
                            minRows={2}
                            maxRows={5}
                        />
                        <TextInput
                            label="Version"
                            value={draft.version}
                            onChange={(event) =>
                                setDraft({ ...draft, version: event.currentTarget.value })
                            }
                            maxLength={100}
                        />
                        <Select
                            label="Source"
                            data={serviceOptions}
                            value={draft.source?.service ?? 'local'}
                            onChange={(value) => {
                                if (value === 'local') setDraft({ ...draft, source: null });
                                else if (value) {
                                    const previousSource = draft.source;
                                    setDraft({
                                        ...draft,
                                        source: {
                                            service: value as GameService,
                                            id:
                                                previousSource?.service === value
                                                    ? previousSource.id
                                                    : value === 'epic'
                                                        ? ''
                                                        : 0
                                        }
                                    });
                                }
                            }}
                            allowDeselect={false}
                            disabled={!creating}
                        />
                        {creating ? (
                            <p className="games-message">
                                {draft.source
                                    ? 'Game details will be fetched from the selected service.'
                                    : 'A local game is saved without requesting an external service.'}
                            </p>
                        ) : null}
                        {draft.source ? (
                            <TextInput
                                label="Source record ID"
                                description={
                                    draft.source.service === 'epic'
                                        ? 'Use the "namespace:catalogItemId" pair shown on the Epic record.'
                                        : undefined
                                }
                                placeholder={
                                    draft.source.service === 'epic'
                                        ? 'namespace:catalogItemId'
                                        : undefined
                                }
                                type={draft.source.service === 'epic' ? 'text' : 'number'}
                                min={draft.source.service === 'epic' ? undefined : 1}
                                step={draft.source.service === 'epic' ? undefined : 1}
                                value={String(draft.source.id || '')}
                                onChange={(event) => {
                                    const source = draft.source;
                                    if (!source) return;
                                    const raw = event.currentTarget.value;
                                    setDraft({
                                        ...draft,
                                        source: {
                                            ...source,
                                            id: source.service === 'epic' ? raw : Number(raw)
                                        }
                                    });
                                }}
                                required
                                disabled={!creating}
                            />
                        ) : null}
                        <Select
                            label="Status"
                            data={statusOptions}
                            value={draft.status}
                            onChange={(value) =>
                                value && setDraft({ ...draft, status: value as GameStatus })
                            }
                            allowDeselect={false}
                        />
                        <TextInput
                            label="Folder"
                            value={draft.folder}
                            onChange={(event) =>
                                setDraft({ ...draft, folder: event.currentTarget.value })
                            }
                            maxLength={255}
                        />
                        <Checkbox
                            label="Online play available"
                            checked={draft.online}
                            onChange={(event) =>
                                setDraft({ ...draft, online: event.currentTarget.checked })
                            }
                        />
                        {saveError ? (
                            <p className="games-error" role="alert">
                                {saveError}
                            </p>
                        ) : null}
                        <div className="game-editor-actions">
                            <HintButton keyLabel="Esc" onClick={closeEditor} disabled={saving}>
                                Cancel
                            </HintButton>
                            <HintButton
                                keyLabel="s"
                                type="submit"
                                disabled={
                                    saving ||
                                    ((!creating || !draft.source) && !draft.title.trim()) ||
                                    !isValidSourceId(draft.source)
                                }
                            >
                                {saving
                                    ? 'Saving…'
                                    : creating
                                        ? draft.source
                                            ? 'Fetch and add game'
                                            : 'Add local game'
                                        : 'Save changes'}
                            </HintButton>
                        </div>
                    </form>
                ) : null}
            </Modal>

            <Modal
                opened={deletingGame !== null}
                onClose={() => {
                    if (!deleting) setDeletingGame(null);
                }}
                title="Delete game"
                centered
            >
                {deletingGame ? (
                    <div className="game-editor">
                        <p className="games-message">
                            Delete <strong>{deletingGame.title}</strong> from your library? This
                            action cannot be undone.
                        </p>
                        {deleteError ? (
                            <p className="games-error" role="alert">
                                {deleteError}
                            </p>
                        ) : null}
                        <div className="game-editor-actions">
                            <HintButton keyLabel="Esc" onClick={() => setDeletingGame(null)} disabled={deleting}>
                                Cancel
                            </HintButton>
                            <HintButton keyLabel="d" danger disabled={deleting} onClick={confirmDelete}>
                                {deleting ? 'Deleting…' : 'Delete'}
                            </HintButton>
                        </div>
                    </div>
                ) : null}
            </Modal>

            <Modal
                opened={searchOpen}
                onClose={() => setSearchOpen(false)}
                title="Search games"
                centered
            >
                <div className="game-editor">
                    <TextInput
                        label="Search"
                        placeholder="grep games…"
                        leftSection={<IconSearch size={16} />}
                        value={query}
                        onChange={(event) => setQuery(event.currentTarget.value)}
                        autoFocus
                    />
                    <Checkbox
                        label="Search everywhere"
                        checked={searchEverywhere}
                        onChange={(event) => setSearchEverywhere(event.currentTarget.checked)}
                    />
                </div>
            </Modal>

            {library !== 'local' ? (
                <SettingsModal
                    opened={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    library={library}
                    onSaved={setSettings}
                />
            ) : null}
        </section>
    );
}
