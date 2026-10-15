import { Badge } from '@mantine/core';
import { HintButton } from './HintButton';
import type { Game } from '../types/game';

type GameDetailsProps = {
    game: Game | null;
    onEdit: (game: Game) => void;
    onDelete: (game: Game) => void;
};

export function GameDetails({ game, onEdit, onDelete }: GameDetailsProps) {
    return (
        <aside className="game-detail" aria-live="polite">
            <div className="detail-panel-title">game info</div>
            {game ? (
                <div className="detail-body">
                    <h3 className="detail-name">{game.title || 'Untitled'}</h3>
                    <Badge
                        variant="light"
                        color="gray"
                        radius="sm"
                        className={`status-badge status-${game.status.toLowerCase()}`}
                    >
                        {game.status}
                    </Badge>
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
