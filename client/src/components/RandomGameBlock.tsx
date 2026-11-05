import { IconPhoto } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { HintButton } from './HintButton';
import { getRandomGame } from '../data/gamesApi';
import type { GameMedia } from '../data/gamesApi';
import { useBlockAvailability, useBlockKeys, useTerminal } from '../terminal/TerminalContext';
import type { Game } from '../types/game';

const serviceNames: Record<string, string> = {
    steam: 'Steam',
    epic: 'Epic Games',
    rawg: 'RAWG',
    f95: 'F95'
};

type RandomGameBlockProps = {
    onOpen: (game: Game) => void;
};

export function RandomGameBlock({ onOpen }: RandomGameBlockProps) {
    const { activeBlock } = useTerminal();
    const active = activeBlock === 'random';
    useBlockAvailability('random', true);

    const [game, setGame] = useState<Game | null>(null);
    const [media, setMedia] = useState<GameMedia | null>(null);
    const [roll, setRoll] = useState(0);

    useEffect(() => {
        let alive = true;

        const load = () => {
            getRandomGame()
                .then((result) => {
                    if (!alive) return;
                    setGame(result.game);
                    setMedia(result.media);
                })
                .catch(() => {
                    if (alive) setGame(null);
                });
        };

        load();
        const timer = window.setInterval(load, 60_000);

        return () => {
            alive = false;
            window.clearInterval(timer);
        };
    }, [roll]);

    useBlockKeys('random', (event) => {
        const key = event.key;
        if (key === 'Enter' && game) {
            event.preventDefault();
            onOpen(game);
            return;
        }
        if (key.toLowerCase() === 'r') {
            event.preventDefault();
            setRoll((current) => current + 1);
        }
    });

    const serviceLabel = game
        ? game.source
            ? serviceNames[game.source.service] ?? game.source.service
            : 'Local'
        : null;

    return (
        <section className={`random-block term-block ${active ? 'is-active' : ''}`} aria-label="Random game">
            <header className="frame-header">
                <span className="frame-title">[0] RANDOM GAME</span>
                <div className="frame-actions">
                    <HintButton keyLabel="r" compact title="Roll another game" onClick={() => setRoll((current) => current + 1)}>
                        Roll
                    </HintButton>
                </div>
            </header>
            <div className="random-body">
                {game ? (
                    <button
                        className="random-game"
                        type="button"
                        title={`Open ${game.title}`}
                        onClick={() => onOpen(game)}
                    >
                        {media?.image ? (
                            <img className="random-game-cover" src={media.image} alt={game.title} loading="lazy" />
                        ) : (
                            <span className="random-game-cover random-game-placeholder">
                                <IconPhoto size={24} stroke={1.3} />
                            </span>
                        )}
                        <span className="random-game-meta">
                            <span className="random-game-title">{game.title || 'Untitled'}</span>
                            <span className="random-game-service">{serviceLabel}</span>
                        </span>
                    </button>
                ) : (
                    <p className="random-game-empty">loading…</p>
                )}
            </div>
        </section>
    );
}
