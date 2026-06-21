import axios from 'axios';

/**
 * OMDb provides IMDb, Rotten Tomatoes and Metacritic ratings, which TMDb does
 * not expose. It requires a free API key (https://www.omdbapi.com/apikey.aspx,
 * 1000 requests/day). Add it to your .env as:
 *
 *   VITE_OMDB_API_KEY=your_key_here
 *
 * If the key is missing the app keeps working — IMDb/RT badges simply do not
 * appear. Lookups are by IMDb id, which we get from TMDb's external_ids.
 */
const OMDB_KEY = import.meta.env.VITE_OMDB_API_KEY;
const OMDB_URL = 'https://www.omdbapi.com/';

export interface OmdbRatings {
  imdbRating?: string; // e.g. "8.5"
  imdbVotes?: string; // e.g. "1,234,567"
  rottenTomatoes?: string; // e.g. "92%"
  metascore?: string; // e.g. "75"
}

export const isOmdbConfigured = (): boolean => Boolean(OMDB_KEY);

// Cache by IMDb id so we never spend quota on the same title twice per session.
const cache = new Map<string, OmdbRatings | null>();

export const fetchOmdbRatings = async (
  imdbId: string | null | undefined,
): Promise<OmdbRatings | null> => {
  if (!OMDB_KEY || !imdbId) return null;
  if (cache.has(imdbId)) return cache.get(imdbId) ?? null;

  try {
    const { data } = await axios.get(OMDB_URL, {
      params: { apikey: OMDB_KEY, i: imdbId, tomatoes: 'true' },
    });

    if (!data || data.Response === 'False') {
      cache.set(imdbId, null);
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

    cache.set(imdbId, ratings);
    return ratings;
  } catch (error) {
    console.error('Error fetching OMDb ratings:', error);
    cache.set(imdbId, null);
    return null;
  }
};
