import React from 'react';
import { Movie, TvShow, getPosterUrl } from '@/services/tmdbService';
import { Star, Info } from 'lucide-react';

interface MediaCardProps {
  item: Movie | TvShow;
  onSelect: (item: Movie | TvShow) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onSelect }) => {
  const isMovie = 'title' in item;
  const title = isMovie ? (item as Movie).title : (item as TvShow).name;
  const date = isMovie ? (item as Movie).release_date : (item as TvShow).first_air_date;
  const year = date ? new Date(date).getFullYear() : null;
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

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

        {rating && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur-sm">
            <Star className="h-3 w-3 fill-amber-300" />
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

      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-text-primary" title={title}>
          {title}
        </h3>
        <p className="text-xs text-text-secondary">{year ?? 'TBA'}</p>
      </div>
    </div>
  );
};

export default MediaCard;
