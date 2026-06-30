import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Heart,
  X,
  Film,
  Tv2,
  CalendarClock,
  Library,
  SlidersHorizontal,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Star,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  getPosterUrl,
  fetchMediaDetails,
  fetchMovieGenres,
  fetchTvShowGenres,
  MediaType,
} from '@/services/tmdbService';
import {
  useFavorites,
  FavoriteItem,
  favoriteDetailPatch,
  FAVORITE_REFRESH_MS,
} from '@/contexts/FavoritesContext';
import MovieDetails from '@/components/MovieDetails';

interface FavoritesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region: string;
}

type Mode = 'upcoming' | 'watchlist';
type SortKey = 'release' | 'rating' | 'runtime' | 'title';
type SortDir = 'asc' | 'desc';
type GroupKey = 'none' | 'genre';

const SORT_LABELS: Record<SortKey, string> = {
  release: 'Release date',
  rating: 'Rating',
  runtime: 'Runtime',
  title: 'Title',
};

/* -------------------------------------------------------------------------- */
/*  Date / countdown helpers (shared)                                          */
/* -------------------------------------------------------------------------- */

/**
 * The date the countdown should target. For TV we prefer the next upcoming
 * episode/season (`nextAirDate`) and fall back to the original `first_air_date`
 * (handles brand-new, not-yet-aired series). Movies just use their release date.
 */
const countdownDate = (fav: FavoriteItem): string =>
  fav.mediaType === 'tv' && fav.nextAirDate ? fav.nextAirDate : fav.releaseDate;

/** Whole days from today until `dateStr` (negative = already released). */
const daysUntil = (dateStr: string): number | null => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'Release date TBA';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Release date TBA';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const yearOf = (fav: FavoriteItem): string =>
  fav.releaseDate ? String(new Date(fav.releaseDate).getFullYear()) : 'TBA';

const formatRuntime = (min?: number): string | null => {
  if (!min) return null;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** "Things I'm waiting for": a future date, or no date yet (TBA). */
const isUpcoming = (fav: FavoriteItem): boolean => {
  const d = daysUntil(countdownDate(fav));
  return d === null || d >= 0;
};

/**
 * Human label for the upcoming date line. For an upcoming TV season/episode we
 * say what's coming ("Season 3 premiere" / "Season 3 · Ep 5"); ended series get
 * their status; everything else just shows the formatted date.
 */
const premiereLabel = (fav: FavoriteItem): string => {
  if (fav.mediaType === 'tv' && fav.nextAirDate) {
    const season = fav.nextSeasonNumber;
    const where =
      fav.nextEpisodeNumber === 1
        ? season != null
          ? `Season ${season} premiere`
          : 'Season premiere'
        : season != null
        ? `Season ${season} · Ep ${fav.nextEpisodeNumber}`
        : 'New episode';
    return `${where} · ${formatDate(fav.nextAirDate)}`;
  }
  if (fav.mediaType === 'tv' && !fav.nextAirDate && fav.status) {
    const ended = fav.status === 'Ended' || fav.status === 'Canceled';
    if (ended) return `${fav.status} · ${formatDate(fav.releaseDate)}`;
  }
  return formatDate(countdownDate(fav));
};

/** Short badge shown over the poster when there's no live countdown. */
const outBadge = (fav: FavoriteItem): string =>
  fav.mediaType === 'tv' && (fav.status === 'Ended' || fav.status === 'Canceled') ? 'Ended' : 'Out';

/** Sort: soonest upcoming first, then most recently released, unknown dates last. */
const byPremiere = (a: FavoriteItem, b: FavoriteItem): number => {
  const da = daysUntil(countdownDate(a));
  const db = daysUntil(countdownDate(b));
  const rank = (d: number | null) => (d === null ? Infinity : d >= 0 ? d : 1_000_000 - d);
  return rank(da) - rank(db);
};

/* -------------------------------------------------------------------------- */
/*  Watchlist sorting / grouping                                               */
/* -------------------------------------------------------------------------- */

const sortValue = (fav: FavoriteItem, key: SortKey): number | string | null => {
  switch (key) {
    case 'release':
      return fav.releaseDate ? new Date(fav.releaseDate).getTime() : null;
    case 'rating':
      return fav.voteAverage ?? null;
    case 'runtime':
      return fav.runtime ?? null;
    case 'title':
      return fav.title.toLocaleLowerCase();
  }
};

/** Comparator that keeps unknown values (missing date/runtime/rating) last, regardless of direction. */
const makeComparator =
  (key: SortKey, dir: SortDir) =>
  (a: FavoriteItem, b: FavoriteItem): number => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av === null && bv === null) return a.title.localeCompare(b.title);
    if (av === null) return 1;
    if (bv === null) return -1;
    let r: number;
    if (typeof av === 'string') {
      r = av.localeCompare(bv as string);
    } else {
      const bn = bv as number;
      r = av < bn ? -1 : av > bn ? 1 : 0;
    }
    if (r === 0) r = a.title.localeCompare(b.title);
    return dir === 'asc' ? r : -r;
  };

const primaryGenre = (fav: FavoriteItem, genreMap: Record<number, string>): string => {
  const id = fav.genreIds?.[0];
  return (id != null && genreMap[id]) || 'Other';
};

/* -------------------------------------------------------------------------- */
/*  Rows                                                                        */
/* -------------------------------------------------------------------------- */

const RemoveButton: React.FC<{ title: string; onRemove: () => void }> = ({ title, onRemove }) => (
  <button
    type="button"
    aria-label={`Remove ${title} from favorites`}
    title="Remove from favorites"
    onClick={(e) => {
      e.stopPropagation();
      onRemove();
    }}
    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-secondary opacity-0 transition hover:bg-white/10 hover:text-rose-300 focus-visible:opacity-100 group-hover:opacity-100"
  >
    <X className="h-4 w-4" />
  </button>
);

const rowBaseClass =
  'group flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2 outline-none transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-accent-blue';

const openKeyHandler = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

/** Upcoming row: big day-count over the poster + what's coming. */
const UpcomingRow: React.FC<{
  fav: FavoriteItem;
  onOpen: (fav: FavoriteItem) => void;
  onRemove: (fav: FavoriteItem) => void;
}> = ({ fav, onOpen, onRemove }) => {
  const days = daysUntil(countdownDate(fav));
  const upcoming = days !== null && days >= 0;
  const numSize =
    days === null ? '' : days >= 1000 ? 'text-2xl' : days >= 100 ? 'text-[30px]' : 'text-[46px]';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(fav)}
      onKeyDown={openKeyHandler(() => onOpen(fav))}
      className={rowBaseClass}
    >
      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-white/5">
        <img
          src={getPosterUrl(fav.posterPath, 'w185')}
          alt={fav.title}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getPosterUrl(null);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
        <div className="absolute inset-0 grid place-items-center">
          {upcoming ? (
            <span
              className={`${numSize} font-black leading-none text-white`}
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
            >
              {days}
            </span>
          ) : (
            <span
              className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            >
              {days === null ? 'TBA' : outBadge(fav)}
            </span>
          )}
        </div>
        {upcoming && (
          <span
            className="absolute bottom-0.5 left-0 right-0 text-center text-[9px] font-semibold uppercase tracking-wider text-white/85"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
          >
            {days === 1 ? 'day' : 'days'}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold leading-snug text-text-primary" title={fav.title}>
          {fav.title}
        </p>
        <p className="mt-0.5 text-sm text-text-secondary">{premiereLabel(fav)}</p>
      </div>

      <RemoveButton title={fav.title} onRemove={() => onRemove(fav)} />
    </div>
  );
};

/** Watchlist row: catalog-style (poster thumb + year · runtime · rating). */
const WatchlistRow: React.FC<{
  fav: FavoriteItem;
  genre: string;
  onOpen: (fav: FavoriteItem) => void;
  onRemove: (fav: FavoriteItem) => void;
}> = ({ fav, genre, onOpen, onRemove }) => {
  const runtime = formatRuntime(fav.runtime);
  const rating = fav.voteAverage ? fav.voteAverage.toFixed(1) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(fav)}
      onKeyDown={openKeyHandler(() => onOpen(fav))}
      className={rowBaseClass}
    >
      <div className="h-20 w-[3.4rem] shrink-0 overflow-hidden rounded-lg bg-white/5">
        <img
          src={getPosterUrl(fav.posterPath, 'w185')}
          alt={fav.title}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getPosterUrl(null);
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold leading-snug text-text-primary" title={fav.title}>
          {fav.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-text-secondary">
          <span>{yearOf(fav)}</span>
          {runtime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {runtime}
            </span>
          )}
          {rating && (
            <span className="flex items-center gap-1 text-amber-300">
              <Star className="h-3 w-3 fill-amber-300" />
              {rating}
            </span>
          )}
          {genre !== 'Other' && (
            <span className="rounded-full bg-white/5 px-2 py-px text-[11px] text-text-secondary">
              {genre}
            </span>
          )}
        </div>
      </div>

      <RemoveButton title={fav.title} onRemove={() => onRemove(fav)} />
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; hint: string }> = ({
  icon,
  title,
  hint,
}) => (
  <div className="flex flex-col items-center gap-2 py-16 text-center">
    <div className="text-text-secondary">{icon}</div>
    <p className="text-sm font-semibold text-text-primary">{title}</p>
    <p className="max-w-[16rem] text-xs text-text-secondary">{hint}</p>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Controls                                                                    */
/* -------------------------------------------------------------------------- */

const SegmentButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}> = ({ active, onClick, icon, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition ${
      active ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
    }`}
  >
    {icon}
    {label}
    <span className="ml-0.5 text-xs opacity-80">{count}</span>
  </button>
);

const ModeTab: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition ${
      active ? 'text-accent-blue' : 'text-text-secondary hover:text-text-primary'
    }`}
  >
    {icon}
    {label}
  </button>
);

const SortMenu: React.FC<{
  sortKey: SortKey;
  sortDir: SortDir;
  groupBy: GroupKey;
  onSortKey: (k: SortKey) => void;
  onGroupBy: (g: GroupKey) => void;
  onToggleDir: () => void;
}> = ({ sortKey, sortDir, groupBy, onSortKey, onGroupBy, onToggleDir }) => (
  <div className="flex items-center gap-1">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/10"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {SORT_LABELS[sortKey]}
          {groupBy === 'genre' && <span className="text-text-secondary">· grouped</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 border-white/10 bg-[#1b1e27] text-text-primary"
      >
        <DropdownMenuLabel className="text-text-secondary">Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => onSortKey(v as SortKey)}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <DropdownMenuRadioItem
              key={k}
              value={k}
              className="text-text-primary focus:bg-white/10 focus:text-text-primary"
            >
              {SORT_LABELS[k]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuLabel className="text-text-secondary">Group by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={groupBy} onValueChange={(v) => onGroupBy(v as GroupKey)}>
          <DropdownMenuRadioItem
            value="none"
            className="text-text-primary focus:bg-white/10 focus:text-text-primary"
          >
            None
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="genre"
            className="text-text-primary focus:bg-white/10 focus:text-text-primary"
          >
            Genre
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    <button
      type="button"
      onClick={onToggleDir}
      aria-label={sortDir === 'asc' ? 'Ascending — tap to reverse' : 'Descending — tap to reverse'}
      title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
      className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-text-secondary transition hover:bg-white/10 hover:text-text-primary"
    >
      {sortDir === 'asc' ? (
        <ArrowUpNarrowWide className="h-4 w-4" />
      ) : (
        <ArrowDownWideNarrow className="h-4 w-4" />
      )}
    </button>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Panel                                                                       */
/* -------------------------------------------------------------------------- */

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ open, onOpenChange, region }) => {
  const { favorites, removeFavorite, updateFavorite } = useFavorites();

  const [mode, setMode] = useState<Mode>('upcoming');
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [sortKey, setSortKey] = useState<SortKey>('release');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [groupBy, setGroupBy] = useState<GroupKey>('none');

  const [genreMap, setGenreMap] = useState<Record<number, string>>({});

  const [detail, setDetail] = useState<any>(null);
  const [detailIsMovie, setDetailIsMovie] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);

  // Genre id → name map (movies + TV), for the "group by genre" headers.
  useEffect(() => {
    let active = true;
    Promise.all([fetchMovieGenres(), fetchTvShowGenres()]).then(([m, t]) => {
      if (!active) return;
      const map: Record<number, string> = {};
      [...(m?.genres ?? []), ...(t?.genres ?? [])].forEach((g) => {
        map[g.id] = g.name;
      });
      setGenreMap(map);
    });
    return () => {
      active = false;
    };
  }, []);

  // Picking a sort field resets to its natural direction (A→Z titles, newest /
  // highest / longest first for the others); the arrow button flips it.
  const chooseSort = (k: SortKey) => {
    setSortKey(k);
    setSortDir(k === 'title' ? 'asc' : 'desc');
  };

  const ofType = (list: FavoriteItem[]) => list.filter((f) => f.mediaType === mediaType);

  const movieFavorites = useMemo(() => favorites.filter((f) => f.mediaType === 'movie'), [favorites]);
  const tvFavorites = useMemo(() => favorites.filter((f) => f.mediaType === 'tv'), [favorites]);

  const upcomingCounts = useMemo(
    () => ({
      movie: movieFavorites.filter(isUpcoming).length,
      tv: tvFavorites.filter(isUpcoming).length,
    }),
    [movieFavorites, tvFavorites],
  );

  // Active "upcoming" list for the chosen media type.
  const upcomingList = useMemo(
    () =>
      favorites.filter((f) => f.mediaType === mediaType && isUpcoming(f)).sort(byPremiere),
    [favorites, mediaType],
  );

  // Active "watchlist" list (everything), sorted by the chosen field/direction.
  const watchlistList = useMemo(
    () =>
      favorites.filter((f) => f.mediaType === mediaType).sort(makeComparator(sortKey, sortDir)),
    [favorites, mediaType, sortKey, sortDir],
  );

  // Grouped view (by primary genre) when requested; null = flat list.
  const watchlistGroups = useMemo(() => {
    if (groupBy !== 'genre') return null;
    const map = new Map<string, FavoriteItem[]>();
    for (const f of watchlistList) {
      const g = primaryGenre(f, genreMap);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(f);
    }
    return [...map.entries()].sort((a, b) =>
      a[0] === 'Other' ? 1 : b[0] === 'Other' ? -1 : a[0].localeCompare(b[0]),
    );
  }, [groupBy, watchlistList, genreMap]);

  // Keep countdowns/runtime/genres current: when the panel is open, enrich
  // favorites that have never been refreshed or whose cached info is stale.
  // Each needs one detail fetch — guarded by a ref so we don't double-request.
  const inFlight = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    const now = Date.now();
    const stale = favorites.filter(
      (f) =>
        (!f.refreshedAt || now - f.refreshedAt > FAVORITE_REFRESH_MS) &&
        !inFlight.current.has(`${f.mediaType}:${f.id}`),
    );
    if (stale.length === 0) return;

    let cancelled = false;
    stale.forEach((f) => {
      const key = `${f.mediaType}:${f.id}`;
      inFlight.current.add(key);
      fetchMediaDetails(f.mediaType, f.id)
        .then((full) => {
          if (cancelled || !full) return;
          updateFavorite(f.id, f.mediaType, favoriteDetailPatch(full, f.mediaType === 'movie'));
        })
        .finally(() => {
          inFlight.current.delete(key);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [open, favorites, updateFavorite]);

  const openDetail = async (fav: FavoriteItem) => {
    const isMovie = fav.mediaType === 'movie';
    setDetailIsMovie(isMovie);
    setDetail({
      id: fav.id,
      title: fav.title,
      name: fav.title,
      poster_path: fav.posterPath,
      release_date: isMovie ? fav.releaseDate : undefined,
      first_air_date: isMovie ? undefined : fav.releaseDate,
      vote_average: fav.voteAverage,
    });
    setDetailOpen(true);
    const full = await fetchMediaDetails(fav.mediaType, fav.id);
    if (full) setDetail(full);
  };

  const onRemove = (fav: FavoriteItem) => removeFavorite(fav.id, fav.mediaType);

  const renderUpcoming = () =>
    upcomingList.length === 0 ? (
      <EmptyState
        icon={<CalendarClock className="h-9 w-9" />}
        title="Nothing on the horizon"
        hint={
          ofType(favorites).length > 0
            ? 'Everything here has already been released — find it under Watchlist.'
            : 'Tap the heart on any title to count down to its premiere here.'
        }
      />
    ) : (
      <div className="flex flex-col gap-2">
        {upcomingList.map((f) => (
          <UpcomingRow key={`${f.mediaType}:${f.id}`} fav={f} onOpen={openDetail} onRemove={onRemove} />
        ))}
      </div>
    );

  const renderWatchlist = () => {
    if (watchlistList.length === 0) {
      return (
        <EmptyState
          icon={<Library className="h-9 w-9" />}
          title={`No ${mediaType === 'movie' ? 'movies' : 'TV shows'} saved yet`}
          hint="Tap the heart on any title to build your watchlist."
        />
      );
    }
    if (watchlistGroups) {
      return (
        <div className="flex flex-col gap-4">
          {watchlistGroups.map(([label, items]) => (
            <div key={label} className="flex flex-col gap-2">
              <h3 className="sticky top-0 z-10 -mx-1 bg-[#13151c]/95 px-1 py-1 text-xs font-bold uppercase tracking-wider text-text-secondary backdrop-blur">
                {label}
                <span className="ml-1.5 opacity-60">{items.length}</span>
              </h3>
              {items.map((f) => (
                <WatchlistRow
                  key={`${f.mediaType}:${f.id}`}
                  fav={f}
                  genre={primaryGenre(f, genreMap)}
                  onOpen={openDetail}
                  onRemove={onRemove}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {watchlistList.map((f) => (
          <WatchlistRow
            key={`${f.mediaType}:${f.id}`}
            fav={f}
            genre={primaryGenre(f, genreMap)}
            onOpen={openDetail}
            onRemove={onRemove}
          />
        ))}
      </div>
    );
  };

  const movieCount = mode === 'upcoming' ? upcomingCounts.movie : movieFavorites.length;
  const tvCount = mode === 'upcoming' ? upcomingCounts.tv : tvFavorites.length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-white/10 bg-[#13151c] p-0 text-text-primary sm:max-w-md [&>button]:hidden"
        >
          <SheetHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-white/10 px-5 py-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg font-bold text-text-primary">
              <Heart className="h-5 w-5 fill-rose-500 text-rose-500" /> Your favorites
            </SheetTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close favorites"
              className="grid h-8 w-8 place-items-center rounded-full text-text-secondary transition hover:bg-white/10 hover:text-text-primary"
            >
              <X className="h-5 w-5" />
            </button>
          </SheetHeader>

          {/* Media type (Movies / TV) — consistent across both modes. */}
          <div className="px-5 pt-4">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1">
              <SegmentButton
                active={mediaType === 'movie'}
                onClick={() => setMediaType('movie')}
                icon={<Film className="h-4 w-4" />}
                label="Movies"
                count={movieCount}
              />
              <SegmentButton
                active={mediaType === 'tv'}
                onClick={() => setMediaType('tv')}
                icon={<Tv2 className="h-4 w-4" />}
                label="TV"
                count={tvCount}
              />
            </div>
          </div>

          {/* Watchlist-only options bar (progressive disclosure: hidden in Upcoming). */}
          {mode === 'watchlist' && watchlistList.length > 0 && (
            <div className="flex items-center justify-between gap-2 px-5 pt-3">
              <span className="text-xs text-text-secondary">
                {watchlistList.length} {watchlistList.length === 1 ? 'title' : 'titles'}
              </span>
              <SortMenu
                sortKey={sortKey}
                sortDir={sortDir}
                groupBy={groupBy}
                onSortKey={chooseSort}
                onGroupBy={setGroupBy}
                onToggleDir={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              />
            </div>
          )}

          {/* Scrollable content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-3">
            {mode === 'upcoming' ? renderUpcoming() : renderWatchlist()}
          </div>

          {/* Bottom navigation: mode switch (app-style). */}
          <div className="flex border-t border-white/10 bg-[#0f1116]">
            <ModeTab
              active={mode === 'upcoming'}
              onClick={() => setMode('upcoming')}
              icon={<CalendarClock className="h-5 w-5" />}
              label="Upcoming"
            />
            <ModeTab
              active={mode === 'watchlist'}
              onClick={() => setMode('watchlist')}
              icon={<Library className="h-5 w-5" />}
              label="Watchlist"
            />
          </div>
        </SheetContent>
      </Sheet>

      {detail && (
        <MovieDetails
          isOpen={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setDetail(null);
          }}
          media={detail}
          isMovie={detailIsMovie}
          region={region}
        />
      )}
    </>
  );
};

export default FavoritesPanel;
