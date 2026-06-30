import React, { useEffect, useState } from 'react';
import { Movie, TvShow, getPosterUrl } from '@/services/tmdbService';
import { fetchOmdbRatingsForMedia, isOmdbConfigured, OmdbRatings } from '@/services/omdbService';
import { Star, Info } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';

interface MediaCardProps {
  item: Movie | TvShow;
  onSelect: (item: Movie | TvShow) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onSelect }) => {
  const isMovie = 'title' in item;
  const title = isMovie ? (item as Movie).title : (item as TvShow).name;
  const date = isMovie ? (item as Movie).release_date : (item as TvShow).first_air_date;
  const year = date ? new Date(date).getFullYear() : null;

  // Rating shown on the poster, picked by source priority IMDb → Rotten Tomatoes
  // → TMDb. The colour tells the source apart: amber = IMDb, red = Rotten
  // Tomatoes, blue = TMDb. TMDb stays the final fallback (no key, no match, or
  // OMDb quota reached) so every card still shows a score.
  const tmdbRating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const [omdb, setOmdb] = useState<OmdbRatings | null>(null);

  useEffect(() => {
    if (!isOmdbConfigured()) return;
    let active = true;
    fetchOmdbRatingsForMedia(isMovie ? 'movie' : 'tv', item.id).then((r) => {
      if (active && r) setOmdb(r);
    });
    return () => {
      active = false;
    };
  }, [item.id, isMovie]);

  const RATING_STYLES = {
    imdb: { text: 'text-amber-300', fill: 'fill-amber-300', label: 'IMDb rating' },
    rt: { text: 'text-red-500', fill: 'fill-red-500', label: 'Rotten Tomatoes' },
    tmdb: { text: 'text-accent-blue', fill: 'fill-accent-blue', label: 'TMDb rating' },
  } as const;

  let rating: string | null = null;
  let ratingStyle: (typeof RATING_STYLES)[keyof typeof RATING_STYLES] | null = null;
  if (omdb?.imdbRating) {
    rating = omdb.imdbRating;
    ratingStyle = RATING_STYLES.imdb;
  } else if (omdb?.rottenTomatoes) {
    rating = omdb.rottenTomatoes;
    ratingStyle = RATING_STYLES.rt;
  } else if (tmdbRating) {
    rating = tmdbRating;
    ratingStyle = RATING_STYLES.tmdb;
  }

  const open = () => onSelect(item);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${title}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-background-surface shadow-lg outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 focus-visible:ring-2 focus-visible:ring-accent-blue"
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={getPosterUrl(item.poster_path, 'w500')}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getPosterUrl(null);
          }}
        />

        {rating && ratingStyle && (
          <div
            title={ratingStyle.label}
            className={`absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold backdrop-blur-sm ${ratingStyle.text}`}
          >
            <Star className={`h-3 w-3 ${ratingStyle.fill}`} />
            {rating}
          </div>
        )}

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="p-3">
            <p className="line-clamp-4 text-xs leading-relaxed text-gray-200">
              {item.overview || 'No description available.'}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-teal">
              <Info className="h-3 w-3" /> View details
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-text-primary" title={title}>
            {title}
          </h3>
          <p className="text-xs text-text-secondary">{year ?? 'TBA'}</p>
        </div>
        <FavoriteButton item={item} isMovie={isMovie} variant="icon" className="-mr-1 mt-0.5" />
      </div>
    </div>
  );
};

export default MediaCard;
