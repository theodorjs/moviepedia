import React, { useEffect, useState } from 'react';
import {
  Movie,
  TvShow,
  fetchTrending,
  getBackdropUrl,
} from '@/services/tmdbService';
import { ShowType } from '@/lib/constants';
import { Star, Info, Sparkles } from 'lucide-react';

interface HeroProps {
  showType: ShowType;
  onSelect: (item: Movie | TvShow) => void;
}

const Hero: React.FC<HeroProps> = ({ showType, onSelect }) => {
  const [items, setItems] = useState<(Movie | TvShow)[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetchTrending(showType, 'week').then((data) => {
      if (!active || !data?.results) return;
      const withBackdrop = data.results.filter((i: any) => i.backdrop_path).slice(0, 5);
      setItems(withBackdrop);
      setIndex(0);
    });
    return () => {
      active = false;
    };
  }, [showType]);

  useEffect(() => {
    if (items.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 7000);
    return () => window.clearInterval(t);
  }, [items]);

  if (!items.length) return null;

  const item = items[index] as any;
  const isMovie = 'title' in item;
  const title = isMovie ? item.title : item.name;
  const date = isMovie ? item.release_date : item.first_air_date;
  const year = date ? new Date(date).getFullYear() : '';
  const backdrop = getBackdropUrl(item.backdrop_path, 'w1280');

  return (
    <section className="relative mb-10 overflow-hidden rounded-2xl border border-white/5">
      <div className="relative h-[340px] sm:h-[440px]">
        {backdrop && (
          <img
            key={backdrop}
            src={backdrop}
            alt={title}
            className="absolute inset-0 h-full w-full animate-[fadein_0.7s_ease] object-cover object-top"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f15] via-[#0d0f15]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f15] via-transparent to-transparent" />

        <div className="relative flex h-full max-w-2xl flex-col justify-end gap-3 p-6 sm:p-10">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-purple/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-purple">
            <Sparkles className="h-3.5 w-3.5" /> Trending this week
          </span>
          <h2 className="text-3xl font-extrabold leading-tight drop-shadow sm:text-5xl">
            {title}
          </h2>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            {item.vote_average ? (
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <Star className="h-4 w-4 fill-amber-300" />
                {item.vote_average.toFixed(1)}
              </span>
            ) : null}
            {year && <span>{year}</span>}
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs uppercase">
              {isMovie ? 'Movie' : 'TV'}
            </span>
          </div>
          <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-gray-300">
            {item.overview}
          </p>
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={() => onSelect(item)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              <Info className="h-4 w-4" /> View details
            </button>
            <div className="flex items-center gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Show featured item ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-6 bg-accent-blue' : 'w-1.5 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
