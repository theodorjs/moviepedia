import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MediaType } from '@/services/tmdbService';

/**
 * A favorited title. We store just enough to render the favorites list without
 * re-fetching: id, type, title, poster and release date. Full details are
 * fetched on demand when the user opens a favorite.
 */
export interface FavoriteItem {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  releaseDate: string; // YYYY-MM-DD, or '' when unknown
  voteAverage?: number;
  addedAt: number;
}

const STORAGE_KEY = 'moviepedia:favorites';
const keyOf = (id: number, mediaType: MediaType) => `${mediaType}:${id}`;

/** Build a FavoriteItem from a TMDb movie/tv object (list item or full detail). */
export const toFavoriteItem = (item: any, isMovie: boolean): FavoriteItem => ({
  id: item.id,
  mediaType: isMovie ? 'movie' : 'tv',
  title: isMovie ? item.title : item.name,
  posterPath: item.poster_path ?? null,
  releaseDate: (isMovie ? item.release_date : item.first_air_date) ?? '',
  voteAverage: item.vote_average,
  addedAt: Date.now(),
});

interface FavoritesContextValue {
  favorites: FavoriteItem[];
  isFavorite: (id: number, mediaType: MediaType) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: number, mediaType: MediaType) => void;
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

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => keyOf(f.id, f.mediaType) === keyOf(item.id, item.mediaType));
      return exists
        ? prev.filter((f) => keyOf(f.id, f.mediaType) !== keyOf(item.id, item.mediaType))
        : [...prev, item];
    });
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, isFavorite, toggleFavorite, removeFavorite, count: favorites.length }),
    [favorites, isFavorite, toggleFavorite, removeFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = (): FavoritesContextValue => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
};
