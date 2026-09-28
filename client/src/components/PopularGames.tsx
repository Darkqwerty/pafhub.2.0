import {
    ActionIcon,
    Badge,
    Button,
    Checkbox,
    Modal,
    Select,
    TextInput,
    Textarea
} from '@mantine/core';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { useMemo, useState, type FormEvent } from 'react';
import { IconPencil, IconPlus, IconTrendingUp } from '@tabler/icons-react';
import { createGame, updateGame } from '../data/gamesApi';
import type { CreateGameInput } from '../data/gamesApi';
import type { Game, GameService, GameStatus } from '../types/game';

type PopularGamesProps = {
    games: Game[];
    loading: boolean;
    error: string | null;
    onGameUpdated: (game: Game) => void;
    onGameCreated: (game: Game) => void;
};

const statusOptions = ['Completed', 'Uncompleted', 'Played', 'WantPlay'];
const serviceOptions = [
    { value: 'local', label: 'Local game' },
    { value: 'steam', label: 'Steam' },
    { value: 'rawg', label: 'RAWG' },
    { value: 'f95', label: 'F95' }
];

export default function PopularGames({
    games,
    loading,
    error,
    onGameUpdated,
    onGameCreated
}: PopularGamesProps) {
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [draft, setDraft] = useState<Game | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const columns = useMemo<MRT_ColumnDef<Game>[]>(
        () => [
            { accessorKey: 'title', header: 'GAME' },
            { accessorKey: 'description', header: 'DESCRIPTION' },
            { accessorKey: 'version', header: 'VERSION' },
            {
                accessorFn: (game) => game.source?.service ?? 'Local',
                id: 'sourceService',
                header: 'SOURCE'
            },
            { accessorFn: (game) => game.source?.id ?? '—', id: 'sourceId', header: 'SOURCE ID' },
            {
                accessorKey: 'status',
                header: 'STATUS',
                Cell: ({ cell }) => (
                    <Badge variant="light" color="gray" radius="sm">
                        {cell.getValue<GameStatus>()}
                    </Badge>
                )
            },
            { accessorKey: 'folder', header: 'FOLDER' },
            {
                accessorKey: 'online',
                header: 'ONLINE',
                Cell: ({ cell }) => (cell.getValue<boolean>() ? 'Yes' : 'No')
            },
            {
                id: 'actions',
                header: '',
                size: 56,
                enableSorting: false,
                Cell: ({ row }) => (
                    <ActionIcon
                        aria-label={`Edit ${row.original.title}`}
                        title="Edit game"
                        variant="subtle"
                        color="gray"
                        onClick={() => {
                            setEditingGame(row.original);
                            setDraft({
                                ...row.original,
                                source: row.original.source ? { ...row.original.source } : null
                            });
                            setSaveError(null);
                        }}
                    >
                        <IconPencil size={16} />
                    </ActionIcon>
                )
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

    return (
        <section className="catalog-section">
            <div className="section-heading catalog-heading">
                <div>
                    <div className="section-overline">
                        <IconTrendingUp size={14} /> YOUR GAME LIBRARY
                    </div>
                    <h2>Games</h2>
                </div>
                <div className="games-heading-actions">
                    <span className="games-count">
                        {games.length} {games.length === 1 ? 'game' : 'games'}
                    </span>
                    <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreateForm}>
                        Add game
                    </Button>
                </div>
            </div>
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
                    data={games}
                    getRowId={(game) => game.id}
                    state={{ isLoading: loading, showProgressBars: loading }}
                    enableTopToolbar={false}
                    enableBottomToolbar={false}
                    enableColumnActions={false}
                    enableColumnFilters={false}
                    enableSorting={false}
                    enablePagination={false}
                    enableDensityToggle={false}
                    enableFullScreenToggle={false}
                    enableHiding={false}
                    mantineTableProps={{ striped: false, highlightOnHover: true }}
                    mantinePaperProps={{ shadow: 'none' }}
                />
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
                            <Button
                                variant="subtle"
                                color="gray"
                                onClick={closeEditor}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                loading={saving}
                                disabled={
                                    ((!creating || !draft.source) && !draft.title.trim()) ||
                                    Boolean(
                                        draft.source &&
                                        (!Number.isInteger(draft.source.id) || draft.source.id < 1)
                                    )
                                }
                            >
                                {creating
                                    ? draft.source
                                        ? 'Fetch and add game'
                                        : 'Add local game'
                                    : 'Save changes'}
                            </Button>
                        </div>
                    </form>
                ) : null}
            </Modal>
        </section>
    );
}
