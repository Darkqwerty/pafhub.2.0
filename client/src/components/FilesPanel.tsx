import { Modal, Textarea } from '@mantine/core';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { HintButton } from './HintButton';
import {
    getGameFiles,
    getGameNotes,
    saveGameNotes,
    uploadGameCover,
    uploadGameSave
} from '../data/gamesApi';
import type { GameFileEntry } from '../data/gamesApi';
import { useBlockAvailability, useBlockKeys, useTerminal } from '../terminal/TerminalContext';
import type { Game } from '../types/game';

type FilesPanelProps = {
    game: Game | null;
    onCoverUploaded?: () => void;
};

function isHtmlFile(name: string): boolean {
    return /\.html?$/i.test(name);
}

/** Returns the kind of action a file entry supports (if any). */
function fileActionKind(entry: GameFileEntry): 'notes' | 'open' | 'download' | null {
    if (entry.kind === 'directory') return null;
    if (entry.name.toLowerCase() === 'notes.txt') return 'notes';
    if (isHtmlFile(entry.name)) return 'open';
    if (/\.save$/i.test(entry.name)) return 'download';
    return null;
}

export function FilesPanel({ game, onCoverUploaded }: FilesPanelProps) {
    const { activeBlock } = useTerminal();
    const active = activeBlock === 'files';
    const hasFolder = Boolean(game?.folder);
    useBlockAvailability('files', hasFolder);

    const [files, setFiles] = useState<GameFileEntry[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [filesError, setFilesError] = useState<string | null>(null);
    const [filesNonce, setFilesNonce] = useState(0);
    const [fileIndex, setFileIndex] = useState(0);

    const [notesOpen, setNotesOpen] = useState(false);
    const [notesDraft, setNotesDraft] = useState('');
    const [notesLoading, setNotesLoading] = useState(false);
    const [notesSaving, setNotesSaving] = useState(false);
    const [notesError, setNotesError] = useState<string | null>(null);

    const [coverUploading, setCoverUploading] = useState(false);
    const [coverError, setCoverError] = useState<string | null>(null);

    const [saveUploading, setSaveUploading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const coverInputRef = useRef<HTMLInputElement>(null);
    const saveInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement | null>(null);

    useEffect(() => {
        let alive = true;
        setFiles([]);
        setFilesError(null);
        setFileIndex(0);
        if (!game) return undefined;

        setFilesLoading(true);
        getGameFiles(game.id)
            .then((entries) => {
                if (alive) setFiles(entries);
            })
            .catch((error: unknown) => {
                if (alive) setFilesError(error instanceof Error ? error.message : 'Could not load files');
            })
            .finally(() => {
                if (alive) setFilesLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [game?.id, filesNonce]);

    const refreshFiles = () => setFilesNonce((n) => n + 1);

    const hasNotesFile = files.some(
        (entry) => entry.kind === 'file' && entry.name.toLowerCase() === 'notes.txt'
    );

    const openNotesEditor = async () => {
        if (!game) return;
        setNotesOpen(true);
        setNotesLoading(true);
        setNotesError(null);
        try {
            setNotesDraft(await getGameNotes(game.id));
        } catch (error) {
            setNotesDraft('');
            setNotesError(error instanceof Error ? error.message : 'Could not load notes');
        } finally {
            setNotesLoading(false);
        }
    };

    const saveNotes = async () => {
        if (!game) return;
        setNotesSaving(true);
        setNotesError(null);
        try {
            await saveGameNotes(game.id, notesDraft);
            setNotesOpen(false);
            refreshFiles();
        } catch (error) {
            setNotesError(error instanceof Error ? error.message : 'Could not save notes');
        } finally {
            setNotesSaving(false);
        }
    };

    const closeNotes = () => {
        if (!notesSaving) setNotesOpen(false);
    };

    const handleCoverFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file || !game) return;
        setCoverUploading(true);
        setCoverError(null);
        try {
            await uploadGameCover(game.id, file);
            refreshFiles();
            onCoverUploaded?.();
        } catch (error) {
            setCoverError(error instanceof Error ? error.message : 'Could not upload cover');
        } finally {
            setCoverUploading(false);
        }
    };

    const handleSaveFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file || !game) return;
        setSaveUploading(true);
        setSaveError(null);
        try {
            await uploadGameSave(game.id, file);
            refreshFiles();
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Could not upload save');
        } finally {
            setSaveUploading(false);
        }
    };

    const fileUrl = (name: string) =>
        `/api/games/${encodeURIComponent(game!.id)}/files/${encodeURIComponent(name)}`;

    /** Activates the currently selected file via the Enter key. */
    const activateEntry = (entry: GameFileEntry) => {
        const kind = fileActionKind(entry);
        if (kind === 'notes') openNotesEditor();
        else if (kind === 'open') window.open(fileUrl(entry.name), '_blank', 'noopener,noreferrer');
        else if (kind === 'download') {
            const anchor = document.createElement('a');
            anchor.href = `${fileUrl(entry.name)}?download=1`;
            anchor.download = '';
            anchor.click();
        }
    };

    useBlockKeys('files', (event) => {
        if (!game) return;
        const key = event.key;

        if (key === 'ArrowDown' && files.length) {
            event.preventDefault();
            setFileIndex((index) => Math.min(index + 1, files.length - 1));
            return;
        }
        if (key === 'ArrowUp' && files.length) {
            event.preventDefault();
            setFileIndex((index) => Math.max(index - 1, 0));
            return;
        }
        if (key === 'Enter' && files.length) {
            event.preventDefault();
            activateEntry(files[fileIndex]);
            return;
        }

        const lower = key.toLowerCase();
        if (lower === 'n' && !hasNotesFile) {
            event.preventDefault();
            void openNotesEditor();
            return;
        }
        if (lower === 'c') {
            event.preventDefault();
            if (!coverUploading) coverInputRef.current?.click();
            return;
        }
        if (lower === 'u') {
            event.preventDefault();
            if (!saveUploading) saveInputRef.current?.click();
            return;
        }
    });

    // Keep the file cursor within bounds and scrolled into view.
    useEffect(() => {
        setFileIndex((index) => Math.min(index, Math.max(files.length - 1, 0)));
    }, [files.length]);

    useEffect(() => {
        if (!active) return;
        listRef.current?.querySelector('[data-file-index="' + fileIndex + '"]')?.scrollIntoView({
            block: 'nearest'
        });
    }, [fileIndex, active]);

    const renderFiles = () => {
        if (filesLoading) {
            return <p className="detail-files-note">Loading files…</p>;
        }
        if (filesError) {
            return (
                <p className="detail-files-note detail-files-error" role="alert">
                    Could not load files: {filesError}
                </p>
            );
        }
        if (files.length === 0) {
            return <p className="detail-files-note">no files</p>;
        }
        return (
            <ul className="detail-files" ref={listRef}>
                {files.map((entry, index) => {
                    const kind = fileActionKind(entry);
                    const selected = index === fileIndex;
                    const selectedClass = active && selected ? ' file-selected' : '';

                    if (entry.kind === 'directory') {
                        return (
                            <li
                                key={entry.name}
                                data-file-index={index}
                                className={`detail-file is-directory${selectedClass}`}
                                onClick={() => setFileIndex(index)}
                            >
                                {entry.name}/
                            </li>
                        );
                    }
                    if (kind === 'notes') {
                        return (
                            <li
                                key={entry.name}
                                data-file-index={index}
                                className={`detail-file${selectedClass}`}
                                onClick={() => setFileIndex(index)}
                            >
                                <button
                                    type="button"
                                    className="detail-file-note-link"
                                    onClick={openNotesEditor}
                                >
                                    {entry.name}
                                </button>
                            </li>
                        );
                    }
                    if (kind === 'open') {
                        return (
                            <li
                                key={entry.name}
                                data-file-index={index}
                                className={`detail-file${selectedClass}`}
                                onClick={() => setFileIndex(index)}
                            >
                                <a
                                    className="detail-file-link"
                                    href={fileUrl(entry.name)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {entry.name}
                                </a>
                            </li>
                        );
                    }
                    if (/^cover\./i.test(entry.name)) {
                        return (
                            <li
                                key={entry.name}
                                data-file-index={index}
                                className={`detail-file is-cover${selectedClass}`}
                                onClick={() => setFileIndex(index)}
                            >
                                {entry.name}
                            </li>
                        );
                    }
                    if (kind === 'download') {
                        return (
                            <li
                                key={entry.name}
                                data-file-index={index}
                                className={`detail-file${selectedClass}`}
                                onClick={() => setFileIndex(index)}
                            >
                                <a
                                    className="detail-file-link detail-file-download"
                                    href={`${fileUrl(entry.name)}?download=1`}
                                >
                                    {entry.name}
                                </a>
                            </li>
                        );
                    }
                    return (
                        <li
                            key={entry.name}
                            data-file-index={index}
                            className={`detail-file${selectedClass}`}
                            onClick={() => setFileIndex(index)}
                        >
                            {entry.name}
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <section
            className={`game-detail files-panel term-block ${active ? 'is-active' : ''}`}
            aria-label="Game files"
        >
            <header className="frame-header">
                <span className="frame-title">[4] FILES</span>
                {game ? (
                    <div className="frame-actions">
                        {!filesLoading && !filesError ? (
                            <>
                                {!hasNotesFile ? (
                                    <HintButton keyLabel="n" compact title="Add notes" onClick={openNotesEditor}>
                                        Add notes
                                    </HintButton>
                                ) : null}
                                <HintButton
                                    keyLabel="c"
                                    compact
                                    title="Add cover"
                                    disabled={coverUploading}
                                    onClick={() => coverInputRef.current?.click()}
                                >
                                    {coverUploading ? 'Uploading…' : 'Add cover'}
                                </HintButton>
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*,image/gif"
                                    className="detail-cover-input"
                                    onChange={handleCoverFile}
                                />
                                <HintButton
                                    keyLabel="u"
                                    compact
                                    title="Add save"
                                    disabled={saveUploading}
                                    onClick={() => saveInputRef.current?.click()}
                                >
                                    {saveUploading ? 'Uploading…' : 'Add save'}
                                </HintButton>
                                <input
                                    ref={saveInputRef}
                                    type="file"
                                    className="detail-cover-input"
                                    onChange={handleSaveFile}
                                />
                            </>
                        ) : null}
                    </div>
                ) : null}
            </header>
            {game ? (
                <div className="detail-body files-body">
                    {game.folder ? (
                        <>
                            <div className="detail-section-label">
                                <span className="detail-folder">{game.folder}</span>
                            </div>
                            {renderFiles()}
                            {coverError ? (
                                <p className="detail-files-note detail-files-error" role="alert">
                                    {coverError}
                                </p>
                            ) : null}
                            {saveError ? (
                                <p className="detail-files-note detail-files-error" role="alert">
                                    {saveError}
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <p className="detail-empty">no folder assigned to this game</p>
                    )}
                </div>
            ) : (
                <p className="detail-empty">select a game to list its files</p>
            )}

            <Modal opened={notesOpen} onClose={closeNotes} title="Notes" centered>
                <div className="game-editor">
                    {notesLoading ? (
                        <p className="games-message">Loading notes…</p>
                    ) : (
                        <Textarea
                            value={notesDraft}
                            onChange={(event) => setNotesDraft(event.currentTarget.value)}
                            autosize
                            minRows={6}
                            maxRows={16}
                            autoFocus
                        />
                    )}
                    {notesError ? (
                        <p className="games-error" role="alert">
                            {notesError}
                        </p>
                    ) : null}
                    <div className="game-editor-actions">
                        <HintButton keyLabel="Esc" onClick={closeNotes} disabled={notesSaving}>
                            Cancel
                        </HintButton>
                        <HintButton
                            keyLabel="s"
                            onClick={saveNotes}
                            disabled={notesLoading || notesSaving}
                        >
                            {notesSaving ? 'Saving…' : 'Save'}
                        </HintButton>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
