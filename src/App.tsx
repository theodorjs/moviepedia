import { useCallback, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import MainContent from './components/MainContent';
import Navigation from './components/Navigation';
import { AppFilters, DEFAULT_FILTERS } from './lib/constants';

function App() {
  const [filters, setFilters] = useState<AppFilters>(DEFAULT_FILTERS);

  const updateFilters = useCallback((patch: Partial<AppFilters>) => {
    setFilters((prev) => {
      const next: AppFilters = { ...prev, ...patch };

      // Switching between Movies and TV: genre ids differ, and cinema-only
      // modes don't apply to TV, so reset those.
      if (patch.showType && patch.showType !== prev.showType) {
        next.genre = '';
        if (next.mode === 'now_playing' || next.mode === 'upcoming') {
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
    <div className="flex min-h-screen flex-col bg-background text-text-primary">
      <Header query={filters.query} onSearch={handleSearch} />
      <Navigation filters={filters} onChange={updateFilters} />
      <MainContent filters={filters} onChange={updateFilters} />
      <Footer />
    </div>
  );
}

export default App;
