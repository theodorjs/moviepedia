import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const IMAGE_BASE = 'https://image.tmdb.org/t/p';

// User is based in Norway, so availability defaults to the Norwegian region.
export const DEFAULT_REGION = 'NO';

/**
 * Minimum vote counts used to keep the lists balanced. Without a floor, TMDb's
 * raw popularity is flooded by regional releases (e.g. a lot of Bollywood) that
 * have very high "popularity" scores but almost no votes. A floor removes that
 * noise while still keeping genuinely popular international titles.
 */
const VOTE_FLOOR_POPULAR = 150;
const VOTE_FLOOR_RATING = 300;

export type MediaType = 'movie' | 'tv';

export interface Genre {
  id: number;
  name: string;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  release_date: string;
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
  genres?: Genre[];
  runtime?: number;
  original_language?: string;
  imdb_id?: string;
  external_ids?: { imdb_id?: string };
}

export interface TvEpisode {
  air_date: string | null;
  season_number: number;
  episode_number: number;
  name?: string;
}

export interface TvShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
  genres?: Genre[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  original_language?: string;
  external_ids?: { imdb_id?: string };
  /** Only present on the TV detail endpoint, not on list items. */
  status?: string;
  next_episode_to_air?: TvEpisode | null;
  last_episode_to_air?: TvEpisode | null;
}

/**
 * The next upcoming air date for a TV show, derived from a *detail* object
 * (`next_episode_to_air` is not present on list items). This drives the
 * favorites countdown: for a returning series it points at the next season /
 * episode rather than the long-past `first_air_date`.
 */
export interface NextAir {
  /** YYYY-MM-DD */
  airDate: string;
  seasonNumber: number;
  episodeNumber: number;
  /** Episode 1 of a season — i.e. a season premiere rather than a mid-run episode. */
  isSeasonPremiere: boolean;
}

export const getTvNextAir = (tvDetail: any): NextAir | null => {
  const next = tvDetail?.next_episode_to_air;
  if (!next?.air_date) return null;
  return {
    airDate: next.air_date,
    seasonNumber: next.season_number,
    episodeNumber: next.episode_number,
    isSeasonPremiere: next.episode_number === 1,
  };
};

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
}

/** Minimal provider shape we cache on a favorite to show its streaming logo. */
export interface ProviderLite {
  name: string;
  logoPath: string | null;
}

export interface TmdbApiResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

const get = async <T>(endpoint: string, params: Record<string, any> = {}): Promise<T | null> => {
  if (!API_KEY) {
    console.error('TMDB API key is missing. Make sure VITE_TMDB_API_KEY is set in your .env file.');
    return null;
  }
  try {
    const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    const response = await axios.get<T>(`${BASE_URL}${endpoint}`, {
      params: {
        api_key: API_KEY,
        language: 'en-US',
        include_adult: false,
        ...filteredParams,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error);
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*  Genres                                                                     */
/* -------------------------------------------------------------------------- */

export const fetchMovieGenres = async (): Promise<{ genres: Genre[] } | null> => {
  return get<{ genres: Genre[] }>('/genre/movie/list');
};

export const fetchTvShowGenres = async (): Promise<{ genres: Genre[] } | null> => {
  return get<{ genres: Genre[] }>('/genre/tv/list');
};

/* -------------------------------------------------------------------------- */
/*  Search                                                                     */
/* -------------------------------------------------------------------------- */

export const searchMovies = async (query: string, page = 1): Promise<TmdbApiResponse<Movie> | null> => {
  return get<TmdbApiResponse<Movie>>('/search/movie', { query, page });
};

export const searchTvShows = async (query: string, page = 1): Promise<TmdbApiResponse<TvShow> | null> => {
  return get<TmdbApiResponse<TvShow>>('/search/tv', { query, page });
};

export const searchMedia = async (
  mediaType: MediaType,
  query: string,
  page = 1,
): Promise<TmdbApiResponse<Movie | TvShow> | null> => {
  return mediaType === 'movie' ? searchMovies(query, page) : searchTvShows(query, page);
};

/* -------------------------------------------------------------------------- */
/*  Trending (used for the hero / featured section)                            */
/* -------------------------------------------------------------------------- */

export const fetchTrending = async (
  mediaType: MediaType,
  timeWindow: 'day' | 'week' = 'week',
): Promise<TmdbApiResponse<Movie | TvShow> | null> => {
  return get<TmdbApiResponse<Movie | TvShow>>(`/trending/${mediaType}/${timeWindow}`);
};

/* -------------------------------------------------------------------------- */
/*  Now playing / Upcoming                                                     */
/* -------------------------------------------------------------------------- */

export const fetchNowPlayingMovies = async (
  page = 1,
  region: string = DEFAULT_REGION,
): Promise<TmdbApiResponse<Movie> | null> => {
  return get<TmdbApiResponse<Movie>>('/movie/now_playing', { page, region });
};

export const fetchUpcomingMovies = async (
  page = 1,
  region: string = DEFAULT_REGION,
): Promise<TmdbApiResponse<Movie> | null> => {
  // /movie/upcoming reports the *primary* (often foreign) release date, so a
  // naive future-only filter wrongly drops most titles. Instead we discover
  // movies whose primary release is between today and ~4 months out, which
  // gives a reliable, well-populated "coming soon" list.
  const today = new Date().toISOString().split('T')[0];
  const future = new Date();
  future.setMonth(future.getMonth() + 4);
  const lte = future.toISOString().split('T')[0];

  return get<TmdbApiResponse<Movie>>('/discover/movie', {
    sort_by: 'popularity.desc',
    'primary_release_date.gte': today,
    'primary_release_date.lte': lte,
    'vote_count.gte': 0,
    region,
    page,
  });
};

/**
 * Upcoming TV: brand-new series premiering soon (a season-1 premiere) plus
 * returning series whose NEXT season premiere is coming up.
 *
 * TMDb's /discover/tv can surface new premieres by `first_air_date`, but it has
 * no "next season premiere" filter. So for returning shows we take a popular
 * pool that has episodes airing in the window, then keep the ones whose next
 * episode is episode 1 of a season (a real season premiere, found via detail).
 * Returning premieres are only added on page 1 (a small, enriched set); later
 * pages simply continue the brand-new-series list.
 */
export const fetchUpcomingTv = async (
  page = 1,
): Promise<TmdbApiResponse<TvShow> | null> => {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date();
  future.setMonth(future.getMonth() + 4);
  const lte = future.toISOString().split('T')[0];

  // Brand-new series — their first air date *is* the premiere we count toward.
  // Sort by popularity, not air date: unaired series all have ~0 votes, so a
  // vote floor can't be used here, and ordering by date alone floods the top
  // with obscure regional/web titles that happen to premiere first. Popularity
  // surfaces the titles people will actually recognize; the merge below then
  // re-sorts the recognizable picks back into a date-ordered timeline.
  const newSeries = await get<TmdbApiResponse<TvShow>>('/discover/tv', {
    'first_air_date.gte': today,
    'first_air_date.lte': lte,
    sort_by: 'popularity.desc',
    'vote_count.gte': 0,
    page,
  });

  let premiereShows: TvShow[] = [];
  if (page === 1) {
    const pool = await get<TmdbApiResponse<TvShow>>('/discover/tv', {
      'first_air_date.lte': today,
      'air_date.gte': today,
      'air_date.lte': lte,
      sort_by: 'popularity.desc',
      'vote_count.gte': 200,
    });
    const candidates = (pool?.results ?? []).slice(0, 14);
    const details = await Promise.all(candidates.map((c) => get<any>(`/tv/${c.id}`)));
    premiereShows = details
      .filter((d) => {
        const n = d?.next_episode_to_air;
        return (
          n &&
          n.episode_number === 1 &&
          typeof n.air_date === 'string' &&
          n.air_date >= today &&
          n.air_date <= lte
        );
      })
      // Show the upcoming season-premiere date on the card, not the (old) first air date.
      .map((d) => ({ ...d, first_air_date: d.next_episode_to_air.air_date }) as TvShow);
  }

  if (!newSeries && premiereShows.length === 0) return null;

  const seen = new Set<number>();
  const merged = [...premiereShows, ...(newSeries?.results ?? [])]
    .filter((s) => (seen.has(s.id) ? false : seen.add(s.id)))
    .sort((a, b) =>
      a.first_air_date < b.first_air_date ? -1 : a.first_air_date > b.first_air_date ? 1 : 0,
    );

  return {
    page: newSeries?.page ?? 1,
    results: merged,
    total_pages: newSeries?.total_pages ?? 1,
    total_results: newSeries?.total_results ?? merged.length,
  };
};

/* -------------------------------------------------------------------------- */
/*  Watch providers                                                            */
/* -------------------------------------------------------------------------- */

/** List of streaming providers available in a region, ordered by popularity. */
export const fetchWatchProviders = async (
  mediaType: MediaType,
  watchRegion: string = DEFAULT_REGION,
): Promise<WatchProvider[]> => {
  const data = await get<{ results: WatchProvider[] }>(`/watch/providers/${mediaType}`, {
    watch_region: watchRegion,
  });
  if (!data?.results) return [];
  return [...data.results].sort(
    (a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999),
  );
};

/* -------------------------------------------------------------------------- */
/*  Details                                                                    */
/* -------------------------------------------------------------------------- */

export const fetchMediaDetails = async (
  mediaType: MediaType,
  id: number,
): Promise<any | null> => {
  const appendForMovie = 'external_ids,credits,videos,watch/providers,release_dates';
  const appendForTv = 'external_ids,credits,videos,watch/providers,content_ratings';
  return get<any>(`/${mediaType}/${id}`, {
    append_to_response: mediaType === 'movie' ? appendForMovie : appendForTv,
  });
};

export const fetchMovieDetails = async (movieId: number): Promise<any | null> => {
  return fetchMediaDetails('movie', movieId);
};

export const fetchTvShowDetails = async (tvShowId: number): Promise<any | null> => {
  return fetchMediaDetails('tv', tvShowId);
};

/**
 * The streaming services a title is available on in `region`, taken from a
 * detail object's appended `watch/providers`. Flatrate first, then free/ads;
 * deduped and capped so a row only shows a couple of logos.
 */
export const extractWatchProviders = (detail: any, region: string): ProviderLite[] => {
  const r = detail?.['watch/providers']?.results?.[region];
  if (!r) return [];
  const seen = new Set<number>();
  const out: ProviderLite[] = [];
  for (const p of [...(r.flatrate ?? []), ...(r.free ?? []), ...(r.ads ?? [])]) {
    if (seen.has(p.provider_id)) continue;
    seen.add(p.provider_id);
    out.push({ name: p.provider_name, logoPath: p.logo_path ?? null });
  }
  return out.slice(0, 4);
};

// IMDb id lookup, used to fetch external (IMDb/RT) ratings. Cached in memory and
// localStorage since a title's external ids essentially never change.
const imdbIdMemCache = new Map<string, string | null>();

export const fetchImdbId = async (
  mediaType: MediaType,
  id: number,
): Promise<string | null> => {
  const key = `${mediaType}:${id}`;
  if (imdbIdMemCache.has(key)) return imdbIdMemCache.get(key) ?? null;

  const lsKey = `mp:imdbid:${key}`;
  try {
    const cached = localStorage.getItem(lsKey);
    if (cached !== null) {
      const value = cached === '' ? null : cached;
      imdbIdMemCache.set(key, value);
      return value;
    }
  } catch {
    /* localStorage unavailable — fall through to network */
  }

  const data = await get<{ imdb_id?: string }>(`/${mediaType}/${id}/external_ids`);
  const imdbId = data?.imdb_id || null;
  imdbIdMemCache.set(key, imdbId);
  try {
    localStorage.setItem(lsKey, imdbId ?? '');
  } catch {
    /* ignore */
  }
  return imdbId;
};

/* -------------------------------------------------------------------------- */
/*  Discover                                                                   */
/* -------------------------------------------------------------------------- */

export interface DiscoverFilters {
  genre?: string;
  /** Pipe-joined TMDb provider ids, e.g. "8|337". */
  providers?: string;
  /** ISO 3166-1 region used together with providers. */
  region?: string;
  /** flatrate | free | ads | rent | buy */
  monetization?: string;
  timePeriod?: string;
  sortBy?: string;
  page?: number;
  category?: 'now_playing' | 'upcoming';
}

const voteFloorFor = (sortBy?: string): number =>
  sortBy && sortBy.startsWith('vote_average') ? VOTE_FLOOR_RATING : VOTE_FLOOR_POPULAR;

const applyTimePeriod = (
  params: Record<string, any>,
  mediaType: MediaType,
  timePeriod: string,
) => {
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split('T')[0];
  const threeMonthsAgoDate = new Date();
  threeMonthsAgoDate.setMonth(threeMonthsAgoDate.getMonth() - 3);
  const threeMonthsAgo = threeMonthsAgoDate.toISOString().split('T')[0];

  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
  const yearParam = mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year';

  if (timePeriod === 'new') {
    params[`${dateField}.gte`] = threeMonthsAgo;
    params[`${dateField}.lte`] = today;
  } else if (timePeriod === 'this_year') {
    params[yearParam] = currentYear;
  } else if (/^\d{4}s$/.test(timePeriod)) {
    // Decade like "2010s", "1990s"
    const decadeStart = parseInt(timePeriod.slice(0, 4), 10);
    params[`${dateField}.gte`] = `${decadeStart}-01-01`;
    params[`${dateField}.lte`] = `${decadeStart + 9}-12-31`;
  }
};

export const discoverMedia = async (
  mediaType: MediaType,
  filters: DiscoverFilters,
): Promise<TmdbApiResponse<Movie | TvShow> | null> => {
  // Dedicated endpoints for cinema categories (movies only).
  if (mediaType === 'movie' && filters.category) {
    const region = filters.region || DEFAULT_REGION;
    if (filters.category === 'now_playing') return fetchNowPlayingMovies(filters.page, region);
    if (filters.category === 'upcoming') return fetchUpcomingMovies(filters.page, region);
  }

  const sortBy = filters.sortBy || 'popularity.desc';
  const params: Record<string, any> = {
    page: filters.page || 1,
    sort_by: sortBy,
    'vote_count.gte': voteFloorFor(sortBy),
  };

  if (filters.genre) params.with_genres = filters.genre;

  if (filters.providers) {
    params.with_watch_providers = filters.providers;
    params.watch_region = filters.region || DEFAULT_REGION;
    params.with_watch_monetization_types = filters.monetization || 'flatrate';
  }

  if (filters.timePeriod) applyTimePeriod(params, mediaType, filters.timePeriod);

  return get<TmdbApiResponse<Movie | TvShow>>(`/discover/${mediaType}`, params);
};

/**
 * Balanced "popular" list. We deliberately use /discover with a vote-count
 * floor instead of /movie/popular so the default view is not dominated by
 * low-vote regional releases.
 */
export const fetchPopularMovies = async (page = 1): Promise<TmdbApiResponse<Movie> | null> => {
  return discoverMedia('movie', { sortBy: 'popularity.desc', page }) as Promise<
    TmdbApiResponse<Movie> | null
  >;
};

export const fetchPopularTvShows = async (page = 1): Promise<TmdbApiResponse<TvShow> | null> => {
  return discoverMedia('tv', { sortBy: 'popularity.desc', page }) as Promise<
    TmdbApiResponse<TvShow> | null
  >;
};

/**
 * "New on streaming": titles released within the last `monthsBack` months that
 * are currently available on the selected providers in the selected region,
 * newest first.
 *
 * NOTE: TMDb does not expose the exact date a title was *added* to a provider,
 * so we approximate "new on streaming" with recently released titles that are
 * available on those providers. This is the standard best-effort with the TMDb
 * API and covers the common case (new releases hitting streaming).
 */
export const discoverNewOnStreaming = async (
  mediaType: MediaType,
  options: {
    providers: string;
    region?: string;
    monetization?: string;
    genre?: string;
    page?: number;
    monthsBack?: number;
  },
): Promise<TmdbApiResponse<Movie | TvShow> | null> => {
  const {
    providers,
    region = DEFAULT_REGION,
    monetization = 'flatrate',
    genre,
    page = 1,
    monthsBack = 6,
  } = options;
  if (!providers) return null;

  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
  const today = new Date().toISOString().split('T')[0];
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - monthsBack);
  const from = fromDate.toISOString().split('T')[0];

  return get<TmdbApiResponse<Movie | TvShow>>(`/discover/${mediaType}`, {
    with_watch_providers: providers,
    watch_region: region,
    with_watch_monetization_types: monetization,
    with_genres: genre || undefined,
    sort_by: `${dateField}.desc`,
    [`${dateField}.lte`]: today,
    [`${dateField}.gte`]: from,
    'vote_count.gte': 0,
    page,
  });
};

/* -------------------------------------------------------------------------- */
/*  Image helpers                                                              */
/* -------------------------------------------------------------------------- */

// Inline dark placeholder so we don't depend on a third-party placeholder host.
export const POSTER_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect width="500" height="750" fill="#1f2433"/><g fill="#3b4256"><path d="M250 300a40 40 0 100 80 40 40 0 000-80zm0 20a20 20 0 110 40 20 20 0 010-40z"/><text x="250" y="430" font-family="sans-serif" font-size="26" fill="#5b637a" text-anchor="middle">No image</text></g></svg>`,
  );

export const getPosterUrl = (posterPath: string | null | undefined, size = 'w500'): string => {
  if (!posterPath) return POSTER_PLACEHOLDER;
  return `${IMAGE_BASE}/${size}${posterPath}`;
};

export const getBackdropUrl = (backdropPath: string | null | undefined, size = 'w1280'): string | null => {
  if (!backdropPath) return null;
  return `${IMAGE_BASE}/${size}${backdropPath}`;
};

export const getProfileUrl = (profilePath: string | null | undefined, size = 'w185'): string | null => {
  if (!profilePath) return null;
  return `${IMAGE_BASE}/${size}${profilePath}`;
};

export const getProviderLogoUrl = (logoPath: string | null | undefined, size = 'w92'): string | null => {
  if (!logoPath) return null;
  return `${IMAGE_BASE}/${size}${logoPath}`;
};
