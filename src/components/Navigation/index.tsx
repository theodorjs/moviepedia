import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clapperboard, CalendarClock, Sparkles, Film, Tv2 } from 'lucide-react';
import { fetchMovieGenres, fetchTvShowGenres, Genre } from '@/services/tmdbService';
import {
  AppFilters,
  BrowseMode,
  COUNTRIES,
  sortOptionsFor,
  TIME_PERIODS,
} from '@/lib/constants';
import ProviderSelect from '@/components/ProviderSelect';

interface NavigationProps {
  filters: AppFilters;
  onChange: (patch: Partial<AppFilters>) => void;
}

const ALL = 'all';
const triggerCls =
  'h-10 w-[180px] border-white/10 bg-white/5 text-sm text-text-primary hover:bg-white/10 focus:ring-2 focus:ring-accent-blue/40 disabled:opacity-40';
const contentCls = 'border-white/10 bg-[#1b1e29] text-text-primary';

const Navigation: React.FC<NavigationProps> = ({ filters, onChange }) => {
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    const load = async () => {
      const data =
        filters.showType === 'movie' ? await fetchMovieGenres() : await fetchTvShowGenres();
      if (data?.genres) setGenres(data.genres);
    };
    load();
  }, [filters.showType]);

  const cinemaMode = filters.mode === 'now_playing' || filters.mode === 'upcoming';
  const streamingMode = filters.mode === 'streaming';
  const searchMode = filters.mode === 'search';

  const disableGenre = cinemaMode || searchMode;
  const disableTime = cinemaMode || streamingMode || searchMode;
  const disableSort = cinemaMode || streamingMode || searchMode;
  const disableProviders = cinemaMode || searchMode;

  const toggleMode = (mode: BrowseMode) =>
    onChange({ mode: filters.mode === mode ? 'browse' : mode, query: '' });

  const sortOptions = sortOptionsFor(filters.showType);

  const ModeButton: React.FC<{
    mode: BrowseMode;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ mode, icon, children }) => {
    const active = filters.mode === mode;
    return (
      <button
        onClick={() => toggleMode(mode)}
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
          active
            ? 'bg-gradient-to-r from-accent-blue to-accent-purple text-white shadow-lg shadow-accent-blue/20'
            : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'
        }`}
      >
        {icon}
        {children}
      </button>
    );
  };

  return (
    <nav className="border-b border-white/5 bg-[#13151c]">
      <div className="container mx-auto flex flex-col gap-4 py-4">
        {/* Row 1 — media type + modes */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Movie / TV segmented toggle */}
          <div className="flex items-center rounded-full bg-white/5 p-1">
            <button
              onClick={() => onChange({ showType: 'movie' })}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filters.showType === 'movie'
                  ? 'bg-accent-blue text-white shadow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Film className="h-4 w-4" /> Movies
            </button>
            <button
              onClick={() => onChange({ showType: 'tv' })}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filters.showType === 'tv'
                  ? 'bg-accent-blue text-white shadow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Tv2 className="h-4 w-4" /> TV Shows
            </button>
          </div>

          <div className="hidden h-6 w-px bg-white/10 sm:block" />

          {filters.showType === 'movie' && (
            <>
              <ModeButton mode="now_playing" icon={<Clapperboard className="h-4 w-4" />}>
                In Cinemas
              </ModeButton>
              <ModeButton mode="upcoming" icon={<CalendarClock className="h-4 w-4" />}>
                Upcoming
              </ModeButton>
            </>
          )}
          <ModeButton mode="streaming" icon={<Sparkles className="h-4 w-4" />}>
            New on Streaming
          </ModeButton>
        </div>

        {/* Row 2 — filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filters.genre || ALL}
            onValueChange={(v) => onChange({ genre: v === ALL ? '' : v })}
            disabled={disableGenre}
          >
            <SelectTrigger className={triggerCls}>
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value={ALL}>All genres</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.timePeriod || ALL}
            onValueChange={(v) => onChange({ timePeriod: v === ALL ? '' : v })}
            disabled={disableTime}
          >
            <SelectTrigger className={triggerCls}>
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value={ALL}>Any time</SelectItem>
              {TIME_PERIODS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.sortBy}
            onValueChange={(v) => onChange({ sortBy: v })}
            disabled={disableSort}
          >
            <SelectTrigger className={triggerCls}>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className={contentCls}>
              {sortOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Country + providers pushed to the right */}
          <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
            <Select value={filters.region} onValueChange={(v) => onChange({ region: v })}>
              <SelectTrigger className={`${triggerCls} w-[160px]`}>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent className={contentCls}>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ProviderSelect
              showType={filters.showType}
              region={filters.region}
              selected={filters.providers}
              onChange={(ids) => onChange({ providers: ids })}
              disabled={disableProviders}
              highlight={streamingMode}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
