import { useCallback, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import MainContent from './components/MainContent';
import Navigation from './components/Navigation';
import FavoritesPanel from './components/FavoritesPanel';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { AppFilters, DEFAULT_FILTERS } from './lib/constants';

function App() {
  const [filters, setFilters] = useState<AppFilters>(DEFAULT_FILTERS);
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  const updateFilters = useCallback((patch: Partial<AppFilters>) => {
    setFilters((prev) => {
      const next: AppFilters = { ...prev, ...patch };

      // Switching between Movies and TV: genre ids differ, and "In Cinemas"
      // (now_playing) is movie-only. "Upcoming" exists for both, so keep it.
      if (patch.showType && patch.showType !== prev.showType) {
        next.genre = '';
        if (next.mode === 'now_playing') {
          next.mode = 'browse';
        }
        // Re-map the sort field between movie/tv date fields.
        next.sortBy = prev.showType === 'movie'
          ? prev.sortBy.replace('primary_release_date', 'first_air_date')
          : prev.sortBy.replace('first_air_date', 'primary_release_date');
      }

      return next;
    });
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      updateFilters({ query, mode: query.trim() ? 'search' : 'browse' });
    },
    [updateFilters],
  );

  return (
    <FavoritesProvider>
      <div className="flex min-h-screen flex-col bg-background text-text-primary">
        <Header query={filters.query} onSearch={handleSearch} />
        <Navigation
          filters={filters}
          onChange={updateFilters}
          onOpenFavorites={() => setFavoritesOpen(true)}
        />
        <MainContent filters={filters} onChange={updateFilters} />
        <Footer />
        <FavoritesPanel
          open={favoritesOpen}
          onOpenChange={setFavoritesOpen}
          region={filters.region}
        />
      </div>
    </FavoritesProvider>
  );
}

export default App;
