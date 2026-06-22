import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popcorn,
  CalendarClock,
  Sparkles,
  Film,
  Tv2,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
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
const triggerBase =
  'h-10 border-white/10 bg-white/5 text-sm text-text-primary hover:bg-white/10 focus:ring-2 focus:ring-accent-blue/40 disabled:opacity-40';
const contentCls = 'border-white/10 bg-[#1b1e29] text-text-primary';

const Navigation: React.FC<NavigationProps> = ({ filters, onChange }) => {
  const [genres, setGenres] = useState<Genre[]>([]);
  // Filters panel: open by default on desktop, collapsed on mobile.
  const [open, setOpen] = useState<boolean>(
    () => typeof window === 'undefined' || window.innerWidth >= 768,
  );

  useEffect(() => {
    const load = async () => {
      const data =
        filters.showType === 'movie' ? await fetchMovieGenres() : await fetchTvShowGenres();
      if (data?.genres) setGenres(data.genres);
    };
    load();
  }, [filters.showType]);

  // Reveal the panel when "New on Streaming" needs providers picked.
  useEffect(() => {
    if (filters.mode === 'streaming' && filters.providers.length === 0) setOpen(true);
  }, [filters.mode, filters.providers.length]);

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

  // Count of active refinements hidden inside the panel (for the badge).
  const activeCount =
    (filters.genre ? 1 : 0) +
    (filters.timePeriod ? 1 : 0) +
    (filters.providers.length ? 1 : 0) +
    (filters.sortBy !== 'popularity.desc' ? 1 : 0);

  // Segmented Movies/TV toggle: the active option shows its label, the inactive
  // one collapses to just its icon on mobile (both labelled from `sm` up).
  const TypeButton: React.FC<{
    type: AppFilters['showType'];
    icon: React.ReactNode;
    label: string;
  }> = ({ type, icon, label }) => {
    const active = filters.showType === type;
    return (
      <button
        onClick={() => onChange({ showType: type })}
        aria-label={label}
        aria-pressed={active}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition sm:px-4 ${
          active
            ? 'bg-accent-blue text-white shadow'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        {icon}
        <span className={`${active ? 'inline' : 'hidden'} sm:inline`}>{label}</span>
      </button>
    );
  };

  // Mode buttons: icon + label. They flex to fill the row on mobile (short
  // labels) and are content-sized with full labels from `sm` up.
  const ModeButton: React.FC<{
    mode: BrowseMode;
    icon: React.ReactNode;
    label: string;
    shortLabel?: string;
  }> = ({ mode, icon, label, shortLabel }) => {
    const active = filters.mode === mode;
    return (
      <button
        onClick={() => toggleMode(mode)}
        aria-label={label}
        aria-pressed={active}
        title={label}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium transition sm:flex-none sm:px-4 sm:text-sm ${
          active
            ? 'bg-gradient-to-r from-accent-blue to-accent-purple text-white shadow-lg shadow-accent-blue/20'
            : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'
        }`}
      >
        {icon}
        <span className="sm:hidden">{shortLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  };

  return (
    <nav className="border-b border-white/5 bg-[#13151c]">
      <div className="container mx-auto py-3">
        <Collapsible open={open} onOpenChange={setOpen}>
          {/* Row 1 — media type + filters toggle */}
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 items-center rounded-full bg-white/5 p-1">
              <TypeButton type="movie" icon={<Film className="h-4 w-4 shrink-0" />} label="Movies" />
              <TypeButton type="tv" icon={<Tv2 className="h-4 w-4 shrink-0" />} label="TV Shows" />
            </div>

            <CollapsibleTrigger asChild>
              <button
                aria-label="Toggle filters"
                className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-white/10 sm:px-4"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                <span>Filters</span>
                {activeCount > 0 && (
                  <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent-blue px-1.5 text-xs font-bold text-white">
                    {activeCount}
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
              </button>
            </CollapsibleTrigger>
          </div>

          {/* Row 2 — view modes */}
          <div className="mt-2 flex items-center gap-1.5 sm:gap-2">
            {filters.showType === 'movie' && (
              <>
                <ModeButton
                  mode="now_playing"
                  icon={<Popcorn className="h-4 w-4 shrink-0" />}
                  label="In Cinemas"
                  shortLabel="Cinemas"
                />
                <ModeButton
                  mode="upcoming"
                  icon={<CalendarClock className="h-4 w-4 shrink-0" />}
                  label="Upcoming"
                />
              </>
            )}
            <ModeButton
              mode="streaming"
              icon={<Sparkles className="h-4 w-4 shrink-0" />}
              label="New on Streaming"
              shortLabel="Streaming"
            />
          </div>

          {/* Collapsible filter criteria */}
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Select
                value={filters.genre || ALL}
                onValueChange={(v) => onChange({ genre: v === ALL ? '' : v })}
                disabled={disableGenre}
              >
                <SelectTrigger className={`${triggerBase} w-full sm:w-[150px]`}>
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
                <SelectTrigger className={`${triggerBase} w-full sm:w-[150px]`}>
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
                <SelectTrigger className={`${triggerBase} w-full sm:w-[150px]`}>
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

              <div className="hidden h-6 w-px bg-white/10 sm:mx-1 sm:block" />

              <Select value={filters.region} onValueChange={(v) => onChange({ region: v })}>
                <SelectTrigger className={`${triggerBase} w-full sm:w-[140px]`}>
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
          </CollapsibleContent>
        </Collapsible>
      </div>
    </nav>
  );
};

export default Navigation;
