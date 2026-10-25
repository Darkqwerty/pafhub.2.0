import { Badge } from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { HintButton } from './HintButton';
import { getGameFiles, getGameMedia } from '../data/gamesApi';
import type { GameFileEntry, GameMedia } from '../data/gamesApi';
import type { Game } from '../types/game';

type GameDetailsProps = {
    game: Game | null;
    onEdit: (game: Game) => void;
    onDelete: (game: Game) => void;
};

function isHtmlFile(name: string): boolean {
    return /\.html?$/i.test(name);
}

export function GameDetails({ game, onEdit, onDelete }: GameDetailsProps) {
    const [files, setFiles] = useState<GameFileEntry[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [filesError, setFilesError] = useState<string | null>(null);
    const [media, setMedia] = useState<GameMedia | null>(null);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        let active = true;
        setMedia(null);
        setImageFailed(false);
        if (!game) return undefined;

        getGameMedia(game.id)
            .then((result) => {
                if (active) setMedia(result);
            })
            .catch(() => {
                if (active) setMedia({ image: null, link: null });
            });
        return () => {
            active = false;
        };
    }, [game?.id]);

    useEffect(() => {
        let active = true;
        setFiles([]);
        setFilesError(null);
        if (!game) return undefined;

        setFilesLoading(true);
        getGameFiles(game.id)
            .then((entries) => {
                if (active) setFiles(entries);
            })
            .catch((error: unknown) => {
                if (active)
                    setFilesError(error instanceof Error ? error.message : 'Could not load files');
            })
            .finally(() => {
                if (active) setFilesLoading(false);
            });
        return () => {
            active = false;
        };
    }, [game?.id]);

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
            <ul className="detail-files">
                {files.map((entry) => {
                    const isDirectory = entry.kind === 'directory';
                    if (isDirectory) {
                        return (
                            <li key={entry.name} className="detail-file is-directory">
                                {entry.name}/
                            </li>
                        );
                    }
                    if (isHtmlFile(entry.name)) {
                        return (
                            <li key={entry.name} className="detail-file">
                                <a
                                    className="detail-file-link"
                                    href={`/api/games/${encodeURIComponent(game!.id)}/files/${encodeURIComponent(entry.name)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {entry.name}
                                </a>
                            </li>
                        );
                    }
                    return (
                        <li key={entry.name} className="detail-file">
                            {entry.name}
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <aside className="game-detail" aria-live="polite">
            <div className="detail-panel-title">game info</div>
            {game ? (
                <div className="detail-body">
                    {media?.image && !imageFailed ? (
                        <img
                            className="detail-image"
                            src={media.image}
                            alt={game.title}
                            loading="lazy"
                            onError={() => setImageFailed(true)}
                        />
                    ) : (
                        <div className="detail-image-placeholder">
                            <IconPhoto size={26} stroke={1.3} />
                            <span>{media === null ? 'loading…' : 'no image'}</span>
                        </div>
                    )}
                    <h3 className="detail-name">{game.title || 'Untitled'}</h3>
                    <Badge
                        variant="light"
                        color="gray"
                        radius="sm"
                        className={`status-badge status-${game.status.toLowerCase()}`}
                    >
                        {game.status}
                    </Badge>
                    {media?.link ? (
                        <a
                            className="detail-external-link"
                            href={media.link}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            open in {game.source?.service ?? 'store'} ↗
                        </a>
                    ) : null}
                    <dl className="detail-grid">
                        <dt>source</dt>
                        <dd>{game.source ? `${game.source.service}:${game.source.id}` : 'local'}</dd>
                        <dt>version</dt>
                        <dd>{game.version || '—'}</dd>
                        <dt>folder</dt>
                        <dd>{game.folder || '—'}</dd>
                        <dt>online</dt>
                        <dd>{game.online ? 'yes' : 'no'}</dd>
                        <dt>id</dt>
                        <dd className="detail-id">{game.id}</dd>
                    </dl>
                    <div className="detail-section-label">description</div>
                    <p className="detail-desc">{game.description || 'No description'}</p>
                    {game.folder ? (
                        <>
                            <div className="detail-section-label">files</div>
                            {renderFiles()}
                        </>
                    ) : null}
                    <div className="detail-actions">
                        <HintButton keyLabel="e" title={`Edit ${game.title}`} onClick={() => onEdit(game)}>
                            Edit
                        </HintButton>
                        <HintButton
                            keyLabel="d"
                            danger
                            title={`Delete ${game.title}`}
                            onClick={() => onDelete(game)}
                        >
                            Delete
                        </HintButton>
                    </div>
                </div>
            ) : (
                <p className="detail-empty">select a game to inspect its details</p>
            )}
        </aside>
    );
}
