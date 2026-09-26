import { lazy, Suspense, useMemo, useState } from 'react';
import { FeaturedGames } from './components/FeaturedGames';
import { HeroIntro } from './components/HeroIntro';
import { PageFooter } from './components/PageFooter';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { games } from './data/games';

const PopularGames = lazy(() => import('./components/PopularGames'));

function App() {
  const [query, setQuery] = useState('');
  const filteredGames = useMemo(
    () => games.filter((game) => game.title.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" id="top">
        <Topbar query={query} onQueryChange={setQuery} />
        <HeroIntro />
        <FeaturedGames games={filteredGames} />
        <Suspense fallback={<section className="catalog-section" aria-busy="true">Loading catalog…</section>}>
          <PopularGames games={filteredGames} />
        </Suspense>
        <PageFooter />
      </main>
    </div>
  );
}

export default App;
