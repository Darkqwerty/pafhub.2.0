import {
    IconChevronRight,
    IconCirclePlus,
    IconCompass,
    IconDeviceGamepad2,
    IconHeart,
    IconLayoutGrid,
    IconSettings,
    IconSparkles
} from '@tabler/icons-react';

const navItems = [
    { label: 'Discover', icon: IconCompass, active: true },
    { label: 'My library', icon: IconLayoutGrid, count: '24' },
    { label: 'Wishlist', icon: IconHeart, count: '8' }
];

export function Sidebar() {
    return (
        <aside className="sidebar">
            <a className="brand" href="#top">
                <span className="brand-mark">
                    <IconDeviceGamepad2 size={20} stroke={2.4} />
                </span>
                <span>
                    PAF<span className="brand-light">HUB</span>
                </span>
            </a>
            <div className="nav-label">MENU</div>
            <nav className="primary-nav">
                {navItems.map(({ label, icon: Icon, count, active }) => (
                    <button className={`nav-item ${active ? 'active' : ''}`} key={label}>
                        <Icon size={19} stroke={1.8} />
                        <span>{label}</span>
                        {count && <span className="nav-count">{count}</span>}
                    </button>
                ))}
            </nav>
            <div className="nav-label collections-label">
                YOUR COLLECTIONS{' '}
                <button className="tiny-add" aria-label="Add collection">
                    <IconCirclePlus size={16} />
                </button>
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
                    <div className="promo-icon">
                        <IconSparkles size={18} />
                    </div>
                    <strong>
                        Your next favorite
                        <br />
                        is out there.
                    </strong>
                    <p>Explore handpicked games made for you.</p>
                    <button>
                        Get recommendations <IconChevronRight size={14} />
                    </button>
                </div>
                <button className="profile">
                    <span className="avatar">T</span>
                    <span className="profile-copy">
                        <strong>Tony</strong>
                        <small>Level 12 explorer</small>
                    </span>
                    <IconSettings size={18} className="profile-settings" />
                </button>
            </div>
        </aside>
    );
}
