import { IconPhoto } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HintButton } from './HintButton';
import { getGameMedia } from '../data/gamesApi';
import type { GameMedia } from '../data/gamesApi';
import { useBlockAvailability, useBlockKeys, useTerminal } from '../terminal/TerminalContext';
import type { Game } from '../types/game';

type GameCardProps = {
    game: Game | null;
    onEdit: (game: Game) => void;
    onDelete: (game: Game) => void;
    mediaNonce?: number;
};

type CardAction = {
    key: string;
    label: string;
    run: () => void;
    danger?: boolean;
};

export function GameCard({ game, onEdit, onDelete, mediaNonce }: GameCardProps) {
    const { activeBlock } = useTerminal();
    const active = activeBlock === 'game';
    useBlockAvailability('game', game !== null);

    const [media, setMedia] = useState<GameMedia | null>(null);
    const [imageFailed, setImageFailed] = useState(false);
    const [actionIndex, setActionIndex] = useState(0);
    const detailBodyRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let alive = true;
        setMedia(null);
        setImageFailed(false);
        if (!game) return undefined;
        getGameMedia(game.id)
            .then((result) => {
                if (alive) setMedia(result);
            })
            .catch(() => {
                if (alive) setMedia({ image: null, link: null });
            });
        return () => {
            alive = false;
        };
    }, [game?.id, mediaNonce]);

    const actions = useMemo<CardAction[]>(() => {
        const list: CardAction[] = [];
        const storeLink = media?.link ?? null;
        if (game && storeLink) {
            list.push({
                key: 't',
                label: 'Store',
                run: () => window.open(storeLink, '_blank', 'noopener,noreferrer'),
            });
        }
        if (game) {
            list.push({ key: 'e', label: 'Edit', run: () => onEdit(game) });
            list.push({ key: 'd', label: 'Delete', danger: true, run: () => onDelete(game) });
        }
        return list;
    }, [game, media, onEdit, onDelete]);

    useBlockKeys('game', (event) => {
        if (!game) return;
        const key = event.key;

        if (key === 'ArrowDown') {
            event.preventDefault();
            detailBodyRef.current?.scrollBy({ top: 48 });
            return;
        }
        if (key === 'ArrowUp') {
            event.preventDefault();
            detailBodyRef.current?.scrollBy({ top: -48 });
            return;
        }
        if (key === 'ArrowRight' && actions.length) {
            event.preventDefault();
            setActionIndex((index) => Math.min(index + 1, actions.length - 1));
            return;
        }
        if (key === 'ArrowLeft' && actions.length) {
            event.preventDefault();
            setActionIndex((index) => Math.max(index - 1, 0));
            return;
        }
        if (key === 'Enter') {
            event.preventDefault();
            actions[actionIndex]?.run();
            return;
        }

        const hit = actions.find((action) => action.key === key.toLowerCase());
        if (hit) {
            event.preventDefault();
            hit.run();
        }
    });

    // Keep the focused action within bounds when the actions list changes.
    useEffect(() => {
        setActionIndex((index) => Math.min(index, Math.max(actions.length - 1, 0)));
    }, [actions.length]);

    const localVersion = game?.version.trim() ?? '';
    const sourceVersion = (game?.sourceVersion ?? '').trim();
    const versionMismatch = Boolean(localVersion && sourceVersion && localVersion !== sourceVersion);

    return (
        <section
            className={`game-detail term-block ${active ? 'is-active' : ''}`}
            aria-live="polite"
            aria-label="Game card"
        >
            <header className="frame-header">
                <span className="frame-title">[3] GAME</span>
                {game ? (
                    <div className="frame-actions">
                        {actions.map((action, index) => (
                            <HintButton
                                key={action.key}
                                keyLabel={action.key}
                                danger={action.danger}
                                title={action.label}
                                compact
                                className={active && index === actionIndex ? 'action-focused' : undefined}
                                onClick={action.run}
                            >
                                {action.label}
                            </HintButton>
                        ))}
                    </div>
                ) : null}
            </header>
            {game ? (
                <div className="detail-body" ref={detailBodyRef}>
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
                    <dl className="detail-grid">
                        <dt>status</dt>
                        <dd>
                            <span className={`status-text status-${game.status.toLowerCase()}`}>
                                {game.status}
                            </span>
                        </dd>
                        <dt>version</dt>
                        <dd>
                            <span className={versionMismatch ? 'version-mismatch' : undefined}>
                                {localVersion || '—'}
                                {sourceVersion ? ` (${sourceVersion})` : ''}
                            </span>
                        </dd>
                    </dl>
                    <div className="detail-section-label">description</div>
                    <p className="detail-desc">{game.description || 'No description'}</p>
                </div>
            ) : (
                <p className="detail-empty">select a game to inspect its details</p>
            )}
        </section>
    );
}
