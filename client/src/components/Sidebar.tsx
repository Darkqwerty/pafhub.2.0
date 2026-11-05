import {
    IconBrandSteam,
    IconCompass,
    IconDeviceDesktop,
    IconDeviceGamepad2,
    IconFlame,
    IconWorld
} from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { RandomGameBlock } from './RandomGameBlock';
import { useBlockAvailability, useBlockKeys, useTerminal } from '../terminal/TerminalContext';
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
    const { activeBlock } = useTerminal();
    const active = activeBlock === 'services';
    const activeItemRef = useRef<HTMLButtonElement | null>(null);

    useBlockAvailability('services', true);

    useBlockKeys('services', (event) => {
        const current = services.findIndex((entry) => entry.service === library);
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            onLibraryChange(services[(current + 1) % services.length].service);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            onLibraryChange(services[(current - 1 + services.length) % services.length].service);
        }
    });

    // Keep the active service visible while navigating this block.
    useEffect(() => {
        if (active) activeItemRef.current?.scrollIntoView({ block: 'nearest' });
    }, [library, active]);

    return (
        <aside className="sidebar">
            <a className="brand" href="#top">
                <span className="brand-mark">&gt;_</span>
                <span>
                    PAF<span className="brand-light">HUB</span>
                </span>
            </a>
            <section className={`services-block term-block ${active ? 'is-active' : ''}`}>
                <header className="frame-header">
                    <span className="frame-title">[1] SERVICES</span>
                </header>
                <div className="services-scroll">
                    <nav className="primary-nav service-nav">
                        {services.map(({ label, service, icon: Icon }) => (
                            <button
                                className={`nav-item ${library === service ? 'active' : ''}`}
                                key={service}
                                ref={library === service ? activeItemRef : undefined}
                                onClick={() => onLibraryChange(service)}
                                aria-current={library === service ? 'true' : undefined}
                            >
                                <Icon size={17} stroke={1.8} />
                                <span>{label}</span>
                                <span className="nav-count">{counts[service] ?? 0}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </section>
            <RandomGameBlock onOpen={onOpenGame} />
        </aside>
    );
}
