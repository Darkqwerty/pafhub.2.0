import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { PageFooter } from './components/PageFooter';
import { Sidebar } from './components/Sidebar';
import { getGameCounts, getGames, updateLibrary } from './data/gamesApi';
import type { Game, GameCounts, GameServiceFilter } from './types/game';

const PopularGames = lazy(() => import('./components/PopularGames'));

export type LibraryUpdateMessage = {
  kind: 'success' | 'error';
  text: string;
};

function App() {
  const [library, setLibrary] = useState<GameServiceFilter>('steam');
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [updatingLibrary, setUpdatingLibrary] = useState(false);
  const [libraryUpdateMessage, setLibraryUpdateMessage] = useState<LibraryUpdateMessage | null>(null);
  const [counts, setCounts] = useState<GameCounts>({ local: 0, steam: 0, rawg: 0, f95: 0, epic: 0 });
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshCounts = useCallback(async () => {
    try {
      setCounts(await getGameCounts());
    } catch {
      // Counts are best-effort; keep the previous values on failure.
    }
  }, []);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

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

  const handleUpdateLibrary = useCallback(async () => {
    if (library === 'local') return;
    setUpdatingLibrary(true);
    setLibraryUpdateMessage(null);
    try {
      const result = await updateLibrary(library);
      const records = await getGames(library);
      setGames(records);
      void refreshCounts();
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
    const matches =
      library === 'local' ? created.source == null : created.source?.service === library;
    if (!matches) return;
    setGames((current) => [created, ...current]);
    void refreshCounts();
  };

  const handleGameDeleted = (id: string) => {
    setGames((current) => current.filter((game) => game.id !== id));
    void refreshCounts();
  };

  const handleLibraryChange = (service: GameServiceFilter) => {
    if (service === library) return;
    setLibrary(service);
    setGamesError(null);
    setLibraryUpdateMessage(null);
  };

  const handleOpenGame = (game: Game) => {
    const service: GameServiceFilter = game.source?.service ?? 'local';
    setLibrary(service);
    setPendingSelection(game.id);
    setGamesError(null);
    setLibraryUpdateMessage(null);
  };

  return (
    <div className="app-shell">
      <Sidebar
        library={library}
        counts={counts}
        onLibraryChange={handleLibraryChange}
        onOpenGame={handleOpenGame}
      />
      <main className="main-content" id="top">
        <Suspense fallback={<section className="catalog-section" aria-busy="true">Loading catalog…</section>}>
          <PopularGames
            games={games}
            loading={loadingGames}
            error={gamesError}
            onGameUpdated={handleGameUpdated}
            onGameCreated={handleGameCreated}
            onGameDeleted={handleGameDeleted}
            library={library}
            updatingLibrary={updatingLibrary}
            onUpdateLibrary={handleUpdateLibrary}
            libraryUpdateMessage={libraryUpdateMessage}
            selectGameId={pendingSelection}
            onSelectGameHandled={() => setPendingSelection(null)}
          />
        </Suspense>
        <PageFooter />
      </main>
    </div>
  );
}

export default App;
