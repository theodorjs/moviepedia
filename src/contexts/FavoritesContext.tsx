import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MediaType, getTvNextAir } from '@/services/tmdbService';

/**
 * A favorited title. We store just enough to render the favorites list without
 * re-fetching: id, type, title, poster and release date. Full details are
 * fetched on demand when the user opens a favorite.
 *
 * For TV we additionally cache "next air" info so the countdown can target the
 * next season/episode instead of the (often long-past) `first_air_date`. These
 * fields are populated by enrichment in the favorites panel and refreshed
 * periodically, since upcoming dates change over time.
 */
export interface FavoriteItem {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  releaseDate: string; // YYYY-MM-DD, or '' when unknown
  voteAverage?: number;
  addedAt: number;
  /** TV only: air date of the next upcoming episode/season (YYYY-MM-DD). */
  nextAirDate?: string;
  /** TV only: season number of `nextAirDate`. */
  nextSeasonNumber?: number;
  /** TV only: episode number of `nextAirDate` (1 = season premiere). */
  nextEpisodeNumber?: number;
  /** TV only: TMDb status, e.g. "Returning Series", "Ended", "Canceled". */
  status?: string;
  /** Timestamp of the last successful detail enrichment (TV). */
  refreshedAt?: number;
}

/** TV "next air"/status info goes stale, so re-enrich favorites this often. */
export const FAVORITE_REFRESH_MS = 12 * 60 * 60 * 1000; // 12 hours

const STORAGE_KEY = 'moviepedia:favorites';
const keyOf = (id: number, mediaType: MediaType) => `${mediaType}:${id}`;

/**
 * Build the TV-only "next air"/status patch from a TMDb object.
 *
 * For a full detail object (has a `status` field) we set every next-air field
 * explicitly — including clearing them when a season has finished airing and
 * `next_episode_to_air` is gone — and stamp `refreshedAt`. For a bare list item
 * (no `status`) we can only fill in what's there and leave it eligible for a
 * later enrichment pass. Returns `{}` for movies, so it's safe to spread.
 */
export const tvNextAirPatch = (item: any, isMovie: boolean): Partial<FavoriteItem> => {
  if (isMovie) return {};
  const next = getTvNextAir(item);
  const isDetail = Boolean(item.status);

  if (isDetail) {
    return {
      status: item.status,
      nextAirDate: next?.airDate,
      nextSeasonNumber: next?.seasonNumber,
      nextEpisodeNumber: next?.episodeNumber,
      refreshedAt: Date.now(),
    };
  }

  // List item: only populate fields we actually have.
  const patch: Partial<FavoriteItem> = {};
  if (next) {
    patch.nextAirDate = next.airDate;
    patch.nextSeasonNumber = next.seasonNumber;
    patch.nextEpisodeNumber = next.episodeNumber;
  }
  return patch;
};

/** Build a FavoriteItem from a TMDb movie/tv object (list item or full detail). */
export const toFavoriteItem = (item: any, isMovie: boolean): FavoriteItem => ({
  id: item.id,
  mediaType: isMovie ? 'movie' : 'tv',
  title: isMovie ? item.title : item.name,
  posterPath: item.poster_path ?? null,
  releaseDate: (isMovie ? item.release_date : item.first_air_date) ?? '',
  voteAverage: item.vote_average,
  addedAt: Date.now(),
  ...tvNextAirPatch(item, isMovie),
});

interface FavoritesContextValue {
  favorites: FavoriteItem[];
  isFavorite: (id: number, mediaType: MediaType) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: number, mediaType: MediaType) => void;
  /** Merge a partial update into an existing favorite (no-op if not present). */
  updateFavorite: (id: number, mediaType: MediaType, patch: Partial<FavoriteItem>) => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const read = (): FavoriteItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
  } catch {
    return [];
  }
};

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(read);

  // Persist on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [favorites]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFavorites(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isFavorite = useCallback(
    (id: number, mediaType: MediaType) =>
      favorites.some((f) => f.id === id && f.mediaType === mediaType),
    [favorites],
  );

  const removeFavorite = useCallback((id: number, mediaType: MediaType) => {
    setFavorites((prev) => prev.filter((f) => keyOf(f.id, f.mediaType) !== keyOf(id, mediaType)));
  }, []);

  const updateFavorite = useCallback(
    (id: number, mediaType: MediaType, patch: Partial<FavoriteItem>) => {
      setFavorites((prev) =>
        prev.map((f) =>
          keyOf(f.id, f.mediaType) === keyOf(id, mediaType) ? { ...f, ...patch } : f,
        ),
      );
    },
    [],
  );

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => keyOf(f.id, f.mediaType) === keyOf(item.id, item.mediaType));
      return exists
        ? prev.filter((f) => keyOf(f.id, f.mediaType) !== keyOf(item.id, item.mediaType))
        : [...prev, item];
    });
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      removeFavorite,
      updateFavorite,
      count: favorites.length,
    }),
    [favorites, isFavorite, toggleFavorite, removeFavorite, updateFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = (): FavoritesContextValue => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
};
