import axios from 'axios';
import { fetchImdbId, MediaType } from './tmdbService';

/**
 * OMDb provides IMDb, Rotten Tomatoes and Metacritic ratings, which TMDb does
 * not expose. It needs a free API key (https://www.omdbapi.com/apikey.aspx,
 * 1000 requests/day). Lookups are by IMDb id (from TMDb's external_ids) and are
 * cached in memory + localStorage so we don't spend quota on the same title
 * twice. Without a key the app keeps working — ratings just don't appear.
 */
const OMDB_KEY = import.meta.env.VITE_OMDB_API_KEY;
const OMDB_URL = 'https://www.omdbapi.com/';
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // cache ratings for 7 days

export interface OmdbRatings {
  imdbRating?: string; // e.g. "8.5"
  imdbVotes?: string; // e.g. "1,234,567"
  rottenTomatoes?: string; // e.g. "92%"
  metascore?: string; // e.g. "75"
}

export const isOmdbConfigured = (): boolean => Boolean(OMDB_KEY);

const memCache = new Map<string, OmdbRatings | null>();

const readLs = (imdbId: string): OmdbRatings | null | undefined => {
  try {
    const raw = localStorage.getItem(`mp:omdb:${imdbId}`);
    if (!raw) return undefined;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > TTL_MS) return undefined;
    return data;
  } catch {
    return undefined;
  }
};

const writeLs = (imdbId: string, data: OmdbRatings | null) => {
  try {
    localStorage.setItem(`mp:omdb:${imdbId}`, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* localStorage unavailable / full — ignore */
  }
};

export const fetchOmdbRatings = async (
  imdbId: string | null | undefined,
): Promise<OmdbRatings | null> => {
  if (!OMDB_KEY || !imdbId) return null;
  if (memCache.has(imdbId)) return memCache.get(imdbId) ?? null;

  const cached = readLs(imdbId);
  if (cached !== undefined) {
    memCache.set(imdbId, cached);
    return cached;
  }

  try {
    const { data } = await axios.get(OMDB_URL, {
      params: { apikey: OMDB_KEY, i: imdbId, tomatoes: 'true' },
    });

    if (!data || data.Response === 'False') {
      // Don't persist a quota-exhaustion error as a permanent "no data".
      const isQuota = typeof data?.Error === 'string' && /limit/i.test(data.Error);
      memCache.set(imdbId, null);
      if (!isQuota) writeLs(imdbId, null);
      return null;
    }

    const clean = (value?: string) => (value && value !== 'N/A' ? value : undefined);
    const ratings: OmdbRatings = {
      imdbRating: clean(data.imdbRating),
      imdbVotes: clean(data.imdbVotes),
      metascore: clean(data.Metascore),
    };
    const rt = Array.isArray(data.Ratings)
      ? data.Ratings.find((r: { Source: string }) => r.Source === 'Rotten Tomatoes')
      : undefined;
    if (rt) ratings.rottenTomatoes = rt.Value;

    memCache.set(imdbId, ratings);
    writeLs(imdbId, ratings);
    return ratings;
  } catch (error) {
    console.error('Error fetching OMDb ratings:', error);
    memCache.set(imdbId, null);
    return null;
  }
};

/** Convenience: resolve a TMDb item straight to its IMDb rating string. */
export const fetchImdbRatingForMedia = async (
  mediaType: MediaType,
  tmdbId: number,
): Promise<string | null> => {
  if (!OMDB_KEY) return null;
  const imdbId = await fetchImdbId(mediaType, tmdbId);
  if (!imdbId) return null;
  const ratings = await fetchOmdbRatings(imdbId);
  return ratings?.imdbRating ?? null;
};
