import React, { useEffect, useRef, useState } from 'react';
import { Film, Search, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeaderProps {
  query: string;
  onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ query, onSearch }) => {
  const [value, setValue] = useState(query);
  const debounceRef = useRef<number>();
  const isMobile = useIsMobile();

  // Keep the input in sync when the query is cleared elsewhere (e.g. mode change).
  useEffect(() => {
    setValue(query);
  }, [query]);

  // Debounce changes so we don't fire a search on every keystroke.
  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      if (value !== query) onSearch(value);
    }, 400);
    return () => window.clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#13151c]/85 backdrop-blur-md">
      <div className="container mx-auto flex items-center gap-3 py-3">
        <a href={import.meta.env.BASE_URL} className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple shadow-lg shadow-accent-blue/20">
            <Film className="h-5 w-5 text-white" />
          </span>
          <span className="bg-gradient-to-r from-accent-blue via-accent-teal to-accent-purple bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">
            Moviepedia
          </span>
        </a>

        {/* Compact on mobile (icon + "Search"), full width on larger screens. */}
        <div className="relative ml-auto w-full min-w-0 max-w-[10rem] sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setValue('');
            }}
            placeholder={isMobile ? 'Search' : 'Search movies & TV shows…'}
            aria-label="Search movies and TV shows"
            className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-9 text-sm text-text-primary outline-none transition placeholder:text-text-secondary focus:border-accent-blue/60 focus:bg-white/10 focus:ring-2 focus:ring-accent-blue/30 sm:py-2.5 sm:pl-10 sm:pr-10"
          />
          {value && (
            <button
              onClick={() => setValue('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary transition hover:text-text-primary sm:right-3"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
