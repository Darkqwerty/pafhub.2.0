import {
    IconBrandSteam,
    IconCompass,
    IconFlame,
    IconHeart,
    IconLayoutGrid,
    IconWorld
} from '@tabler/icons-react';
import { HintButton } from './HintButton';
import type { GameService } from '../types/game';

const navItems = [
    { label: 'Discover', icon: IconCompass, active: true },
    { label: 'My library', icon: IconLayoutGrid, count: '24' },
    { label: 'Wishlist', icon: IconHeart, count: '8' }
];

const libraries: Array<{ label: string; service: GameService; icon: typeof IconCompass }> = [
    { label: 'Steam', service: 'steam', icon: IconBrandSteam },
    { label: 'RAWG', service: 'rawg', icon: IconWorld },
    { label: 'F95', service: 'f95', icon: IconFlame }
];

type SidebarProps = {
    library: GameService;
    onLibraryChange: (service: GameService) => void;
};

export function Sidebar({ library, onLibraryChange }: SidebarProps) {
    return (
        <aside className="sidebar">
            <a className="brand" href="#top">
                <span className="brand-mark">&gt;_</span>
                <span>
                    PAF<span className="brand-light">HUB</span>
                </span>
            </a>
            <div className="nav-label"># MENU</div>
            <nav className="primary-nav">
                {navItems.map(({ label, icon: Icon, count, active }) => (
                    <button className={`nav-item ${active ? 'active' : ''}`} key={label}>
                        <Icon size={17} stroke={1.8} />
                        <span>{label}</span>
                        {count && <span className="nav-count">{count}</span>}
                    </button>
                ))}
            </nav>
            <div className="nav-label libraries-label"># LIBRARIES</div>
            <nav className="primary-nav library-nav">
                {libraries.map(({ label, service, icon: Icon }) => (
                    <button
                        className={`nav-item ${library === service ? 'active' : ''}`}
                        key={service}
                        onClick={() => onLibraryChange(service)}
                    >
                        <Icon size={17} stroke={1.8} />
                        <span>{label}</span>
                    </button>
                ))}
            </nav>
            <div className="nav-label collections-label">
                # COLLECTIONS{' '}
                <HintButton keyLabel="+" compact title="Add collection">Add</HintButton>
            </div>
            <nav className="primary-nav collection-nav">
                <button className="nav-item">
                    <span className="collection-dot dot-lime" />
                    <span>Currently playing</span>
                    <span className="nav-count">3</span>
                </button>
                <button className="nav-item">
                    <span className="collection-dot dot-blue" />
                    <span>To play next</span>
                    <span className="nav-count">12</span>
                </button>
                <button className="nav-item">
                    <span className="collection-dot dot-orange" />
                    <span>Completed</span>
                    <span className="nav-count">9</span>
                </button>
            </nav>
            <div className="sidebar-bottom">
                <div className="sidebar-promo">
                    <strong>
                        Your next favorite
                        <br />
                        is out there.
                    </strong>
                    <p>Explore handpicked games made for you.</p>
                    <HintButton keyLabel="r" compact>get-recommendations</HintButton>
                </div>
                <button className="profile">
                    <span className="avatar">T</span>
                    <span className="profile-copy">
                        <strong>tony</strong>
                        <small>uid=1000 · pafhub</small>
                    </span>
                    <span className="profile-hint">
                        <span className="hint-key">s</span>
                        <span className="hint-label">:setup</span>
                    </span>
                </button>
            </div>
        </aside>
    );
}
