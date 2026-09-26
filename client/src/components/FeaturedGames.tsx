import { IconChevronRight, IconHeart, IconSparkles } from '@tabler/icons-react';
import type { Game } from '../types/game';

const palettes = ['violet', 'sand', 'ember', 'ice', 'pink'];

export function FeaturedGames({ games }: { games: Game[] }) {
  return (
    <section className="featured-section">
      <div className="section-heading"><div><div className="section-overline"><IconSparkles size={14} /> CURATED FOR YOU</div><h2>Featured games</h2></div><button className="view-all">View all <IconChevronRight size={16} /></button></div>
      <div className="featured-grid">
        {games.length === 0 ? <p className="featured-empty">Games will appear here after they are added to the catalog.</p> : games.slice(0, 4).map((game, index) => (
          <article className={`game-card card-${palettes[index % palettes.length]}`} key={game.id}>
            <div className="card-art">
              <span className="art-orb" />
              <span className="art-copy">{game.title.split('\n').map((line) => <span key={line}>{line}</span>)}</span>
              <span className="art-index">0{index + 1}</span>
              <button className="save-game" aria-label={`Save ${game.title}`}><IconHeart size={17} /></button>
              <span className="card-tag">{game.status}</span>
            </div>
            <div className="card-info"><div><h3>{game.title}</h3><p>{game.description || 'No description'}</p></div><span className={`online-state ${game.online ? 'is-online' : ''}`}>{game.online ? 'Online' : 'Offline'}</span></div>
            <div className="card-genre">{game.source.service.toUpperCase()} · v{game.version || '—'}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
