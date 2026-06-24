import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites, toFavoriteItem } from '@/contexts/FavoritesContext';

interface FavoriteButtonProps {
  /** A TMDb movie/tv list item or full detail object. */
  item: any;
  isMovie: boolean;
  /** `icon` = compact heart (cards); `labeled` = pill with text (detail view). */
  variant?: 'icon' | 'labeled';
  className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  item,
  isMovie,
  variant = 'icon',
  className = '',
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [pop, setPop] = useState(false);
  const active = isFavorite(item.id, isMovie ? 'movie' : 'tv');

  const handleClick = (e: React.MouseEvent) => {
    // Cards are themselves clickable — don't open the detail view when toggling.
    e.preventDefault();
    e.stopPropagation();
    if (!active) {
      setPop(true);
      window.setTimeout(() => setPop(false), 450);
    }
    toggleFavorite(toFavoriteItem(item, isMovie));
  };

  const label = active ? 'Remove from favorites' : 'Add to favorites';

  if (variant === 'labeled') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={label}
        className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
          active
            ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
            : 'border-white/10 bg-white/5 text-text-primary hover:bg-white/10'
        } ${className}`}
      >
        <Heart
          className={`h-4 w-4 shrink-0 ${active ? 'fill-rose-400 text-rose-400' : ''} ${
            pop ? 'animate-heart-pop' : ''
          }`}
        />
        {active ? 'In favorites' : 'Add to favorites'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 ${className}`}
    >
      <Heart
        className={`h-4 w-4 transition ${active ? 'fill-rose-500 text-rose-500' : 'text-white'} ${
          pop ? 'animate-heart-pop' : ''
        }`}
      />
    </button>
  );
};

export default FavoriteButton;
