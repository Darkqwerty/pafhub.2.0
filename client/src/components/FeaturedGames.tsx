import { IconChevronRight, IconHeart, IconSparkles, IconStar } from '@tabler/icons-react';
import type { Game } from '../types/game';

export function FeaturedGames({ games }: { games: Game[] }) {
  return (
    <section className="featured-section">
      <div className="section-heading"><div><div className="section-overline"><IconSparkles size={14} /> CURATED FOR YOU</div><h2>Featured games</h2></div><button className="view-all">View all <IconChevronRight size={16} /></button></div>
      <div className="featured-grid">{games.slice(0, 4).map((game, index) => <article className={`game-card card-${game.palette}`} key={game.title}><div className="card-art"><span className="art-orb" /><span className="art-copy">{game.art.split('\n').map((line) => <span key={line}>{line}</span>)}</span><span className="art-index">0{index + 1}</span><button className="save-game" aria-label={`Save ${game.title}`}><IconHeart size={17} /></button><span className="card-tag">{game.status}</span></div><div className="card-info"><div><h3>{game.title}</h3><p>{game.studio}</p></div><div className="game-rating"><IconStar size={14} fill="currentColor" /> {game.rating}</div></div><div className="card-genre">{game.genre}</div></article>)}</div>
    </section>
  );
}
