import React, { useEffect, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Tv } from 'lucide-react';
import {
  fetchWatchProviders,
  getProviderLogoUrl,
  WatchProvider,
} from '@/services/tmdbService';
import { ShowType } from '@/lib/constants';

interface ProviderSelectProps {
  showType: ShowType;
  region: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  highlight?: boolean;
}

const ProviderSelect: React.FC<ProviderSelectProps> = ({
  showType,
  region,
  selected,
  onChange,
  disabled,
  highlight,
}) => {
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let active = true;
    fetchWatchProviders(showType, region).then((list) => {
      if (active) setProviders(list);
    });
    return () => {
      active = false;
    };
  }, [showType, region]);

  // If the region changes, drop any selected providers not offered there.
  useEffect(() => {
    if (!providers.length || !selected.length) return;
    const valid = new Set(providers.map((p) => String(p.provider_id)));
    const next = selected.filter((id) => valid.has(id));
    if (next.length !== selected.length) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? providers.filter((p) => p.provider_name.toLowerCase().includes(q))
      : providers;
    return list.slice(0, 60);
  }, [providers, filter]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const label =
    selected.length === 0
      ? 'Streaming services'
      : `${selected.length} service${selected.length > 1 ? 's' : ''}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={`h-10 w-[200px] justify-between gap-2 border-white/10 bg-white/5 text-sm font-normal text-text-primary hover:bg-white/10 ${
            highlight && selected.length === 0 ? 'ring-2 ring-accent-teal/60' : ''
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Tv className="h-4 w-4 shrink-0 text-accent-teal" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 border-white/10 bg-[#1b1e29] p-0 text-text-primary"
      >
        <div className="border-b border-white/10 p-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter services…"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-text-secondary focus:border-accent-blue/60"
          />
        </div>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="w-full border-b border-white/10 px-3 py-2 text-left text-xs text-accent-blue hover:bg-white/5"
          >
            Clear selection ({selected.length})
          </button>
        )}
        <div className="max-h-72 overflow-y-auto py-1">
          {visible.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-text-secondary">
              No services found.
            </p>
          )}
          {visible.map((p) => {
            const id = String(p.provider_id);
            const checked = selected.includes(id);
            const logo = getProviderLogoUrl(p.logo_path);
            return (
              <button
                key={p.provider_id}
                onClick={() => toggle(id)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-white/5"
              >
                {logo ? (
                  <img src={logo} alt="" className="h-6 w-6 rounded" />
                ) : (
                  <span className="h-6 w-6 rounded bg-white/10" />
                )}
                <span className="flex-1 truncate">{p.provider_name}</span>
                {checked && <Check className="h-4 w-4 text-accent-teal" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ProviderSelect;
