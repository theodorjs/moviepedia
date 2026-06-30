import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, X, Film, Tv2 } from 'lucide-react';
import { getPosterUrl, fetchMediaDetails, MediaType } from '@/services/tmdbService';
import {
  useFavorites,
  FavoriteItem,
  tvNextAirPatch,
  FAVORITE_REFRESH_MS,
} from '@/contexts/FavoritesContext';
import MovieDetails from '@/components/MovieDetails';

interface FavoritesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region: string;
}

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

/**
 * Human label for the date line. For an upcoming TV season/episode we say what's
 * coming ("Season 3 premiere" / "Season 3 · Ep 5"); ended series get their
 * status; everything else just shows the formatted date.
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
  // No upcoming TV date: surface an "ended" status rather than a stale date.
  if (fav.mediaType === 'tv' && !fav.nextAirDate && fav.status) {
    const ended = fav.status === 'Ended' || fav.status === 'Canceled';
    if (ended) return `${fav.status} · ${formatDate(fav.releaseDate)}`;
  }
  return formatDate(countdownDate(fav));
};

/** Short badge shown over the poster when there's no live countdown. */
const outBadge = (fav: FavoriteItem): string => {
  if (fav.mediaType === 'tv' && fav.status === 'Ended') return 'Ended';
  if (fav.mediaType === 'tv' && fav.status === 'Canceled') return 'Ended';
  return 'Out';
};

/** Sort: soonest upcoming first, then most recently released, unknown dates last. */
const byPremiere = (a: FavoriteItem, b: FavoriteItem): number => {
  const da = daysUntil(countdownDate(a));
  const db = daysUntil(countdownDate(b));
  const rank = (d: number | null) => (d === null ? Infinity : d >= 0 ? d : 1_000_000 - d);
  return rank(da) - rank(db);
};

const FavoriteRow: React.FC<{
  fav: FavoriteItem;
  onOpen: (fav: FavoriteItem) => void;
  onRemove: (fav: FavoriteItem) => void;
}> = ({ fav, onOpen, onRemove }) => {
  const days = daysUntil(countdownDate(fav));
  const upcoming = days !== null && days >= 0;
  // Shrink the number as it gains digits so it fills roughly the same share of
  // the poster whether it reads "5", "21" or "107".
  const numSize =
    days === null ? '' : days >= 1000 ? 'text-2xl' : days >= 100 ? 'text-[30px]' : 'text-[46px]';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(fav)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(fav);
        }
      }}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2 outline-none transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-accent-blue"
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
        {/* Day-count overlay with a dark gradient + text-shadow for legibility. */}
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

      <button
        type="button"
        aria-label={`Remove ${fav.title} from favorites`}
        title="Remove from favorites"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(fav);
        }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-secondary opacity-0 transition hover:bg-white/10 hover:text-rose-300 focus-visible:opacity-100 group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const EmptyState: React.FC<{ kind: string }> = ({ kind }) => (
  <div className="flex flex-col items-center gap-2 py-16 text-center">
    <Heart className="h-9 w-9 text-text-secondary" />
    <p className="text-sm font-semibold text-text-primary">No favorite {kind} yet</p>
    <p className="max-w-[15rem] text-xs text-text-secondary">
      Tap the heart on any title to keep an eye on its premiere here.
    </p>
  </div>
);

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ open, onOpenChange, region }) => {
  const { favorites, removeFavorite, updateFavorite } = useFavorites();

  const [detail, setDetail] = useState<any>(null);
  const [detailIsMovie, setDetailIsMovie] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);

  const movies = useMemo(
    () => favorites.filter((f) => f.mediaType === 'movie').sort(byPremiere),
    [favorites],
  );
  const shows = useMemo(
    () => favorites.filter((f) => f.mediaType === 'tv').sort(byPremiere),
    [favorites],
  );

  // Keep TV countdowns current: when the panel is open, enrich TV favorites that
  // have never been refreshed or whose cached "next air"/status info is stale.
  // `next_episode_to_air` only exists on the detail endpoint, so each needs one
  // fetch — guarded by a ref so we don't re-request a title already in flight.
  const inFlight = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    const now = Date.now();
    const stale = favorites.filter(
      (f) =>
        f.mediaType === 'tv' &&
        (!f.refreshedAt || now - f.refreshedAt > FAVORITE_REFRESH_MS) &&
        !inFlight.current.has(`${f.id}`),
    );
    if (stale.length === 0) return;

    let cancelled = false;
    stale.forEach((f) => {
      inFlight.current.add(`${f.id}`);
      fetchMediaDetails('tv', f.id)
        .then((full) => {
          if (cancelled || !full) return;
          // Always stamp refreshedAt (via tvNextAirPatch) so an up-to-date show
          // with no upcoming episode isn't re-fetched on every open.
          updateFavorite(f.id, 'tv', tvNextAirPatch(full, false));
        })
        .finally(() => {
          inFlight.current.delete(`${f.id}`);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [open, favorites, updateFavorite]);

  const openDetail = async (fav: FavoriteItem) => {
    const isMovie = fav.mediaType === 'movie';
    setDetailIsMovie(isMovie);
    // Show something immediately, then enrich with full details.
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
    const full = await fetchMediaDetails(fav.mediaType as MediaType, fav.id);
    if (full) setDetail(full);
  };

  const renderList = (items: FavoriteItem[], kind: string) =>
    items.length === 0 ? (
      <EmptyState kind={kind} />
    ) : (
      <div className="flex flex-col gap-2">
        {items.map((f) => (
          <FavoriteRow
            key={`${f.mediaType}:${f.id}`}
            fav={f}
            onOpen={openDetail}
            onRemove={(fav) => removeFavorite(fav.id, fav.mediaType)}
          />
        ))}
      </div>
    );

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

          <Tabs defaultValue="movie" className="flex min-h-0 flex-1 flex-col">
            <div className="px-5 pt-4">
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger
                  value="movie"
                  className="gap-1.5 text-text-secondary data-[state=active]:bg-accent-blue data-[state=active]:text-white"
                >
                  <Film className="h-4 w-4" /> Movies
                  <span className="ml-0.5 text-xs opacity-80">{movies.length}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="tv"
                  className="gap-1.5 text-text-secondary data-[state=active]:bg-accent-blue data-[state=active]:text-white"
                >
                  <Tv2 className="h-4 w-4" /> TV Shows
                  <span className="ml-0.5 text-xs opacity-80">{shows.length}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-3">
              <TabsContent value="movie" className="mt-0">
                {renderList(movies, 'movies')}
              </TabsContent>
              <TabsContent value="tv" className="mt-0">
                {renderList(shows, 'TV shows')}
              </TabsContent>
            </div>
          </Tabs>
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
