import React, { useCallback, useEffect, useState } from 'react';
import {
  Movie,
  TvShow,
  discoverMedia,
  discoverNewOnStreaming,
  fetchUpcomingTv,
  searchMedia,
  fetchMediaDetails,
  TmdbApiResponse,
} from '@/services/tmdbService';
import { AppFilters, COUNTRIES, TIME_PERIODS } from '@/lib/constants';
import MediaCard from '@/components/MediaCard';
import Hero from '@/components/Hero';
import MovieDetails from '@/components/MovieDetails';
import { Loader2, Tv, SearchX } from 'lucide-react';

interface MainContentProps {
  filters: AppFilters;
  onChange: (patch: Partial<AppFilters>) => void;
}

type Resp = TmdbApiResponse<Movie | TvShow> | null;
const EMPTY: TmdbApiResponse<Movie | TvShow> = { page: 1, results: [], total_pages: 0, total_results: 0 };

const MainContent: React.FC<MainContentProps> = ({ filters, onChange }) => {
  const [items, setItems] = useState<(Movie | TvShow)[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<any>(null);
  const [selectedIsMovie, setSelectedIsMovie] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { showType, mode, genre, timePeriod, sortBy, region, providers, query } = filters;
  const providerStr = providers.join('|');
  const streamingNeedsProviders = mode === 'streaming' && providerStr === '';

  const fetchPage = useCallback(
    async (p: number): Promise<Resp> => {
      if (mode === 'search') {
        return query.trim() ? await searchMedia(showType, query.trim(), p) : EMPTY;
      }
      if (mode === 'now_playing') {
        return (await discoverMedia('movie', { category: 'now_playing', region, page: p })) as Resp;
      }
      if (mode === 'upcoming') {
        return showType === 'tv'
          ? ((await fetchUpcomingTv(p)) as Resp)
          : ((await discoverMedia('movie', { category: 'upcoming', region, page: p })) as Resp);
      }
      if (mode === 'streaming') {
        if (!providerStr) return EMPTY;
        return (await discoverNewOnStreaming(showType, {
          providers: providerStr,
          region,
          genre,
          page: p,
        })) as Resp;
      }
      return (await discoverMedia(showType, {
        genre,
        timePeriod,
        sortBy,
        providers: providerStr || undefined,
        region,
        page: p,
      })) as Resp;
    },
    [showType, mode, genre, timePeriod, sortBy, region, providerStr, query],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchPage(1)
      .then((data) => {
        if (!active) return;
        if (data && data.results) {
          setItems(data.results);
          setPage(data.page || 1);
          setTotalPages(data.total_pages || 1);
        } else {
          setItems([]);
          setPage(1);
          setTotalPages(1);
          if (data === null) setError('Could not load data. Please check your connection and try again.');
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Something went wrong while loading titles.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    if (page >= totalPages || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchPage(page + 1);
    if (data?.results) {
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...data.results.filter((i) => !seen.has(i.id))];
      });
      setPage(data.page);
      setTotalPages(data.total_pages);
    }
    setLoadingMore(false);
  };

  const handleSelect = async (item: Movie | TvShow) => {
    const isMovie = 'title' in item;
    setSelectedIsMovie(isMovie);
    setSelected(item);
    setDetailsOpen(true);
    const detailed = await fetchMediaDetails(isMovie ? 'movie' : 'tv', item.id);
    if (detailed) setSelected(detailed);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelected(null);
  };

  const showHero =
    mode === 'browse' && !genre && !timePeriod && providerStr === '' && !error;

  const titleText = (): string => {
    const t = showType === 'movie' ? 'Movies' : 'TV Shows';
    if (mode === 'search') return query.trim() ? `Results for “${query.trim()}”` : 'Search';
    if (mode === 'now_playing') return 'In Cinemas Now';
    if (mode === 'upcoming') return showType === 'movie' ? 'Upcoming Movies' : 'Upcoming TV Shows';
    if (mode === 'streaming') return `New on Streaming · ${t}`;
    let base = `Popular ${t}`;
    if (sortBy.startsWith('vote_average')) base = `Top Rated ${t}`;
    else if (sortBy.startsWith('revenue')) base = `Top Grossing ${t}`;
    else if (sortBy.endsWith('date.desc')) base = `Newest ${t}`;
    else if (sortBy.endsWith('date.asc')) base = `Oldest ${t}`;
    const period = TIME_PERIODS.find((p) => p.id === timePeriod)?.name;
    return period ? `${base} · ${period}` : base;
  };

  const regionName = COUNTRIES.find((c) => c.code === region)?.name ?? region;
  const subtitle =
    mode === 'streaming' && !streamingNeedsProviders
      ? `Recently released titles available on your selected services in ${regionName}.`
      : null;

  return (
    <main className="container mx-auto flex-grow px-4 py-6 sm:py-8">
      {showHero && <Hero showType={showType} onSelect={handleSelect} />}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">{titleText()}</h2>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
          {error}
        </div>
      )}

      {/* Streaming mode without providers selected */}
      {streamingNeedsProviders && !error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 py-16 text-center">
          <Tv className="h-10 w-10 text-accent-teal" />
          <p className="text-lg font-semibold text-text-primary">Pick your streaming services</p>
          <p className="max-w-md text-sm text-text-secondary">
            Choose your country and the services you subscribe to above to see which new titles
            have landed on streaming.
          </p>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && !error && !streamingNeedsProviders && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-xl bg-white/5" />
              <div className="mt-2 h-3 w-3/4 rounded bg-white/5" />
              <div className="mt-1.5 h-2.5 w-1/3 rounded bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !streamingNeedsProviders && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 py-16 text-center">
          <SearchX className="h-10 w-10 text-text-secondary" />
          <p className="text-lg font-semibold text-text-primary">No titles found</p>
          <p className="max-w-md text-sm text-text-secondary">
            Nothing matched these filters. Try widening your search.
          </p>
          <button
            onClick={() =>
              onChange({ mode: 'browse', genre: '', timePeriod: '', providers: [], query: '' })
            }
            className="mt-2 rounded-full bg-accent-blue px-5 py-2 text-sm font-semibold text-white hover:bg-accent-blue/80"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* Results grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} onSelect={handleSelect} />
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && items.length > 0 && page < totalPages && (
        <div className="mt-10 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-3 text-sm font-semibold text-text-primary transition hover:bg-white/10 disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {selected && (
        <MovieDetails
          isOpen={detailsOpen}
          onClose={closeDetails}
          media={selected}
          isMovie={selectedIsMovie}
          region={region}
        />
      )}
    </main>
  );
};

export default MainContent;
