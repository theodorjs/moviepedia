export type ShowType = 'movie' | 'tv';

/** High-level browsing modes the UI can be in. */
export type BrowseMode = 'browse' | 'now_playing' | 'upcoming' | 'streaming' | 'search';

export interface AppFilters {
  showType: ShowType;
  mode: BrowseMode;
  genre: string; // '' = all
  timePeriod: string; // '' = all
  sortBy: string;
  region: string; // ISO 3166-1 country code
  providers: string[]; // TMDb provider ids
  query: string; // free-text search
}

export const DEFAULT_FILTERS: AppFilters = {
  showType: 'movie',
  mode: 'browse',
  genre: '',
  timePeriod: '',
  sortBy: 'popularity.desc',
  region: 'NO',
  providers: [],
  query: '',
};

/** Watch-provider regions. Norway first since that's the user's default. */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'NO', name: 'Norway' },
  { code: 'SE', name: 'Sweden' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IS', name: 'Iceland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'AU', name: 'Australia' },
];

export const TIME_PERIODS: { id: string; name: string }[] = [
  { id: 'new', name: 'New (last 3 months)' },
  { id: 'this_year', name: 'This year' },
  { id: '2020s', name: '2020s' },
  { id: '2010s', name: '2010s' },
  { id: '2000s', name: '2000s' },
  { id: '1990s', name: '1990s' },
  { id: '1980s', name: '1980s' },
  { id: '1970s', name: '1970s' },
];

/** Sort options expressed for movies; mapped to TV equivalents at render time. */
export const SORT_OPTIONS: { id: string; name: string }[] = [
  { id: 'popularity.desc', name: 'Most popular' },
  { id: 'vote_average.desc', name: 'Highest rated' },
  { id: 'primary_release_date.desc', name: 'Newest first' },
  { id: 'primary_release_date.asc', name: 'Oldest first' },
  { id: 'revenue.desc', name: 'Top grossing' },
];

export const sortOptionsFor = (showType: ShowType) => {
  if (showType === 'movie') return SORT_OPTIONS;
  return SORT_OPTIONS.filter((o) => o.id !== 'revenue.desc').map((o) => ({
    ...o,
    id: o.id.replace('primary_release_date', 'first_air_date'),
  }));
};
