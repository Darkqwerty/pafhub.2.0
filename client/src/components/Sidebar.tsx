import {
    IconBrandSteam,
    IconCompass,
    IconDeviceDesktop,
    IconDeviceGamepad2,
    IconFlame,
    IconWorld
} from '@tabler/icons-react';
import { RandomGameCard } from './RandomGameCard';
import type { Game, GameCounts, GameServiceFilter } from '../types/game';

const services: Array<{ label: string; service: GameServiceFilter; icon: typeof IconCompass }> = [
    { label: 'Local', service: 'local', icon: IconDeviceDesktop },
    { label: 'Steam', service: 'steam', icon: IconBrandSteam },
    { label: 'Epic Games', service: 'epic', icon: IconDeviceGamepad2 },
    { label: 'RAWG', service: 'rawg', icon: IconWorld },
    { label: 'F95', service: 'f95', icon: IconFlame }
];

type SidebarProps = {
    library: GameServiceFilter;
    counts: GameCounts;
    onLibraryChange: (service: GameServiceFilter) => void;
    onOpenGame: (game: Game) => void;
};

export function Sidebar({ library, counts, onLibraryChange, onOpenGame }: SidebarProps) {
    return (
        <aside className="sidebar">
            <a className="brand" href="#top">
                <span className="brand-mark">&gt;_</span>
                <span>
                    PAF<span className="brand-light">HUB</span>
                </span>
            </a>
            <div className="nav-label services-label"># SERVICES</div>
            <nav className="primary-nav service-nav">
                {services.map(({ label, service, icon: Icon }) => (
                    <button
                        className={`nav-item ${library === service ? 'active' : ''}`}
                        key={service}
                        onClick={() => onLibraryChange(service)}
                    >
                        <Icon size={17} stroke={1.8} />
                        <span>{label}</span>
                        <span className="nav-count">{counts[service] ?? 0}</span>
                    </button>
                ))}
            </nav>
            <div className="sidebar-bottom">
                <div className="sidebar-promo">
                    <RandomGameCard onOpen={onOpenGame} />
                </div>
            </div>
        </aside>
    );
}
