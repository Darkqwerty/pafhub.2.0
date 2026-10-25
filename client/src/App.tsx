import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageFooter } from './components/PageFooter';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { getGames, updateLibrary } from './data/gamesApi';
import type { Game, GameService } from './types/game';

const PopularGames = lazy(() => import('./components/PopularGames'));

export type LibraryUpdateMessage = {
  kind: 'success' | 'error';
  text: string;
};

function App() {
  const [query, setQuery] = useState('');
  const [library, setLibrary] = useState<GameService>('steam');
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [updatingLibrary, setUpdatingLibrary] = useState(false);
  const [libraryUpdateMessage, setLibraryUpdateMessage] = useState<LibraryUpdateMessage | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setGamesError(null);

    // Don't flash the loading indicator on fast switches: only surface it if
    // the request is still in flight after a short grace period.
    loadingTimerRef.current = setTimeout(() => {
      if (active) setLoadingGames(true);
    }, 2000);

    getGames(library)
      .then((records) => {
        if (active) setGames(records);
      })
      .catch((error: unknown) => {
        if (active) setGamesError(error instanceof Error ? error.message : 'Could not load games');
      })
      .finally(() => {
        if (!active) return;
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
        setLoadingGames(false);
      });
    return () => {
      active = false;
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [library]);

  const filteredGames = useMemo(
    () => games.filter((game) =>
      `${game.title} ${game.description} ${game.version} ${game.folder} ${game.source?.service ?? 'local'} ${game.source?.id ?? ''} ${game.status}`
        .toLowerCase()
        .includes(query.toLowerCase())),
    [query, games],
  );

  const handleUpdateLibrary = useCallback(async () => {
    setUpdatingLibrary(true);
    setLibraryUpdateMessage(null);
    try {
      const result = await updateLibrary(library);
      const records = await getGames(library);
      setGames(records);
      const added = result.added;
      setLibraryUpdateMessage(
        result.errors.length
          ? {
              kind: 'error',
              text: `Updated ${result.updated} of ${result.total} games, added ${added} new (${result.errors.length} failed).`,
            }
          : {
              kind: 'success',
              text:
                result.total === 0 && added === 0
                  ? 'No games to update in this library.'
                  : `Library updated: ${result.updated} refreshed, ${added} added.`,
            },
      );
    } catch (error) {
      setLibraryUpdateMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Could not update library',
      });
    } finally {
      setUpdatingLibrary(false);
    }
  }, [library]);

  const handleGameUpdated = (updated: Game) => {
    setGames((current) => current.map((game) => game.id === updated.id ? updated : game));
  };

  const handleGameCreated = (created: Game) => {
    if (created.source?.service !== library) return;
    setGames((current) => [created, ...current]);
  };

  const handleGameDeleted = (id: string) => {
    setGames((current) => current.filter((game) => game.id !== id));
  };

  const handleLibraryChange = (service: GameService) => {
    if (service === library) return;
    setLibrary(service);
    setGamesError(null);
    setLibraryUpdateMessage(null);
  };

  return (
    <div className="app-shell">
      <Sidebar library={library} onLibraryChange={handleLibraryChange} />
      <main className="main-content" id="top">
        <Topbar query={query} onQueryChange={setQuery} />
        <Suspense fallback={<section className="catalog-section" aria-busy="true">Loading catalog…</section>}>
          <PopularGames
            games={filteredGames}
            loading={loadingGames}
            error={gamesError}
            onGameUpdated={handleGameUpdated}
            onGameCreated={handleGameCreated}
            onGameDeleted={handleGameDeleted}
            library={library}
            updatingLibrary={updatingLibrary}
            onUpdateLibrary={handleUpdateLibrary}
            libraryUpdateMessage={libraryUpdateMessage}
          />
        </Suspense>
        <PageFooter />
      </main>
    </div>
  );
}

export default App;
