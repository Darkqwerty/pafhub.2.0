import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { FeaturedGames } from './components/FeaturedGames';
import { HeroIntro } from './components/HeroIntro';
import { PageFooter } from './components/PageFooter';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { getGames } from './data/gamesApi';
import type { Game } from './types/game';

const PopularGames = lazy(() => import('./components/PopularGames'));

function App() {
  const [query, setQuery] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getGames()
      .then((records) => {
        if (active) setGames(records);
      })
      .catch((error: unknown) => {
        if (active) setGamesError(error instanceof Error ? error.message : 'Could not load games');
      })
      .finally(() => {
        if (active) setLoadingGames(false);
      });
    return () => { active = false; };
  }, []);

  const filteredGames = useMemo(
    () => games.filter((game) =>
      `${game.title} ${game.description} ${game.version} ${game.folder} ${game.source.service} ${game.source.id} ${game.status}`
        .toLowerCase()
        .includes(query.toLowerCase())),
    [query],
  );

  const handleGameUpdated = (updated: Game) => {
    setGames((current) => current.map((game) => game.id === updated.id ? updated : game));
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" id="top">
        <Topbar query={query} onQueryChange={setQuery} />
        <HeroIntro />
        <FeaturedGames games={filteredGames} />
        <Suspense fallback={<section className="catalog-section" aria-busy="true">Loading catalog…</section>}>
          <PopularGames
            games={filteredGames}
            loading={loadingGames}
            error={gamesError}
            onGameUpdated={handleGameUpdated}
          />
        </Suspense>
        <PageFooter />
      </main>
    </div>
  );
}

export default App;
