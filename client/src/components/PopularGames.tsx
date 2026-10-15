import {
    Checkbox,
    Modal,
    Select,
    TextInput,
    Textarea,
    Tooltip
} from '@mantine/core';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { IconTerminal2 } from '@tabler/icons-react';
import { GameDetails } from './GameDetails';
import { HintButton } from './HintButton';
import { createGame, deleteGame, updateGame } from '../data/gamesApi';
import type { CreateGameInput } from '../data/gamesApi';
import type { Game, GameService, GameStatus } from '../types/game';

type PopularGamesProps = {
    games: Game[];
    loading: boolean;
    error: string | null;
    onGameUpdated: (game: Game) => void;
    onGameCreated: (game: Game) => void;
    onGameDeleted: (id: string) => void;
    library: GameService;
    updatingLibrary: boolean;
    onUpdateLibrary: () => void;
    libraryUpdateMessage: { kind: 'success' | 'error'; text: string } | null;
};

const statusOptions = ['Completed', 'Uncompleted', 'Played', 'WantPlay'];
const serviceOptions = [
    { value: 'local', label: 'Local game' },
    { value: 'steam', label: 'Steam' },
    { value: 'rawg', label: 'RAWG' },
    { value: 'f95', label: 'F95' }
];

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
    libraryUpdateMessage
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
        const sorted = [...games].sort((a, b) => {
            const left = String(a[sorting.id]).toLowerCase();
            const right = String(b[sorting.id]).toLowerCase();
            return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });
        });
        return sorting.desc ? sorted.reverse() : sorted;
    }, [games, sorting]);

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

    const selectedGame = useMemo(
        () => displayGames.find((game) => game.id === selectedId) ?? null,
        [displayGames, selectedId]
    );

    const columns = useMemo<MRT_ColumnDef<Game>[]>(
        () => [
            { accessorKey: 'title', header: 'GAME', size: 320 },
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
        ],
        []
    );

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

    return (
        <section className="catalog-section">
            <div className="section-heading catalog-heading">
                <div>
                    <div className="section-overline">
                        <IconTerminal2 size={14} /> ls ~/games
                    </div>
                    <h2>games</h2>
                </div>
                <div className="games-heading-actions">
                    <span className="games-count">
                        [{games.length}] {games.length === 1 ? 'game' : 'games'}
                    </span>
                    <div className="sort-control">
                        <HintButton keyLabel="s" title="Sort by column" onClick={() => setSortOpen((open) => !open)}>
                            Sort
                        </HintButton>
                        {sortOpen ? (
                            <>
                                <div className="sort-backdrop" onClick={() => setSortOpen(false)} />
                                <div className="sort-menu" role="menu">
                                    {sortColumns.map((column) => {
                                        const active = sorting.id === column.id;
                                        return (
                                            <button
                                                key={column.id}
                                                type="button"
                                                role="menuitemradio"
                                                aria-checked={active}
                                                className={`sort-item${active ? ' active' : ''}`}
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
                    <HintButton
                        keyLabel="u"
                        title={`Update ${library} library`}
                        disabled={updatingLibrary}
                        onClick={onUpdateLibrary}
                    >
                        {updatingLibrary ? 'Updating…' : 'Update library'}
                    </HintButton>
                    <HintButton keyLabel="a" title="Add game" onClick={openCreateForm}>
                        Add game
                    </HintButton>
                </div>
            </div>
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
            <div className="catalog-body">
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
                        mantineTableProps={{ striped: false, highlightOnHover: true }}
                        mantineTableBodyRowProps={({ row }) => ({
                            onClick: () => setSelectedId(row.id),
                            className: row.id === selectedId ? 'row-selected' : undefined,
                            style: { cursor: 'pointer' }
                        })}
                        mantinePaperProps={{ shadow: 'none' }}
                    />
                </div>
                <GameDetails game={selectedGame} onEdit={startEdit} onDelete={startDelete} />
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
                                type="number"
                                min={1}
                                step={1}
                                value={String(draft.source.id || '')}
                                onChange={(event) => {
                                    const source = draft.source;
                                    if (source)
                                        setDraft({
                                            ...draft,
                                            source: {
                                                ...source,
                                                id: Number(event.currentTarget.value)
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
                                    Boolean(
                                        draft.source &&
                                        (!Number.isInteger(draft.source.id) || draft.source.id < 1)
                                    )
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
        </section>
    );
}
