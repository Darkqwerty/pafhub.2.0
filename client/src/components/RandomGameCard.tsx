import { useEffect, useState } from 'react';
import { IconPhoto } from '@tabler/icons-react';
import { getRandomGame } from '../data/gamesApi';
import type { GameMedia } from '../data/gamesApi';
import type { Game } from '../types/game';

const serviceNames: Record<string, string> = {
    steam: 'Steam',
    epic: 'Epic Games',
    rawg: 'RAWG',
    f95: 'F95'
};

type RandomGameCardProps = {
    onOpen: (game: Game) => void;
};

export function RandomGameCard({ onOpen }: RandomGameCardProps) {
    const [game, setGame] = useState<Game | null>(null);
    const [media, setMedia] = useState<GameMedia | null>(null);

    useEffect(() => {
        let active = true;

        const loadRandomGame = () => {
            getRandomGame()
                .then((result) => {
                    if (!active) return;
                    setGame(result.game);
                    setMedia(result.media);
                })
                .catch(() => {
                    if (active) setGame(null);
                });
        };

        loadRandomGame();
        const timer = window.setInterval(loadRandomGame, 60_000);

        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, []);

    if (!game) return null;

    const serviceLabel = game.source
        ? serviceNames[game.source.service] ?? game.source.service
        : 'Local';

    return (
        <button className="promo-game" type="button" onClick={() => onOpen(game)} title={`Open ${game.title}`}>
            {media?.image ? (
                <img
                    className="promo-game-cover"
                    src={media.image}
                    alt={game.title}
                    loading="lazy"
                />
            ) : (
                <span className="promo-game-cover promo-game-placeholder">
                    <IconPhoto size={28} stroke={1.3} />
                </span>
            )}
            <span className="promo-game-meta">
                <span className="promo-game-title">{game.title || 'Untitled'}</span>
                <span className="promo-game-service">{serviceLabel}</span>
            </span>
        </button>
    );
}
