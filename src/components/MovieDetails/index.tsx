import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Star, Play, ExternalLink, Clock, Calendar, Tv } from 'lucide-react';
import {
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  getProviderLogoUrl,
} from '@/services/tmdbService';
import { fetchOmdbRatings, OmdbRatings } from '@/services/omdbService';

interface MovieDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  media: any;
  isMovie: boolean;
  region: string;
}

const RatingPill: React.FC<{
  label: string;
  value: string;
  className: string;
  href?: string;
}> = ({ label, value, className, href }) => {
  const base = `flex items-center gap-2 rounded-lg px-3 py-1.5 ${className}`;
  const inner = (
    <>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open on ${label.replace('🍅 ', '')}`}
      className={`${base} cursor-pointer transition hover:brightness-125 hover:ring-1 hover:ring-white/20`}
    >
      {inner}
    </a>
  ) : (
    <div className={base}>{inner}</div>
  );
};

const MovieDetails: React.FC<MovieDetailsProps> = ({ isOpen, onClose, media, isMovie, region }) => {
  const [ratings, setRatings] = useState<OmdbRatings | null>(null);
  const [zoomed, setZoomed] = useState(false);

  const imdbId: string | undefined = media?.imdb_id || media?.external_ids?.imdb_id;

  useEffect(() => {
    if (!imdbId) {
      setRatings(null);
      return;
    }
    let active = true;
    fetchOmdbRatings(imdbId).then((r) => {
      if (active) setRatings(r);
    });
    return () => {
      active = false;
    };
  }, [imdbId]);

  if (!media) return null;

  const title = isMovie ? media.title : media.name;
  const date = isMovie ? media.release_date : media.first_air_date;
  const year = date ? new Date(date).getFullYear() : null;
  const backdrop = getBackdropUrl(media.backdrop_path, 'w1280');

  const tmdbScore = media.vote_average ? media.vote_average.toFixed(1) : null;
  const runtime = isMovie
    ? media.runtime
    : Array.isArray(media.episode_run_time)
    ? media.episode_run_time[0]
    : undefined;

  const genres: { id: number; name: string }[] = media.genres || [];
  const cast = (media.credits?.cast || []).slice(0, 8);

  const crew = media.credits?.crew || [];
  const director = isMovie
    ? crew.find((c: any) => c.job === 'Director')?.name
    : (media.created_by || []).map((c: any) => c.name).join(', ');

  const trailer =
    media.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
    media.videos?.results?.find((v: any) => v.site === 'YouTube');
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

  // Each rating pill links out to that service's page for this title. TMDb/IMDb
  // link by id; RT/Metacritic have no id here, so they open a title search.
  const tmdbUrl = `https://www.themoviedb.org/${isMovie ? 'movie' : 'tv'}/${media.id}`;
  const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}` : undefined;
  const rtUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`;
  const metacriticUrl = `https://www.metacritic.com/search/${encodeURIComponent(title)}/`;

  // Where to watch. Movies in many regions only have rent/buy (not flatrate),
  // so fall back to those so the section still appears for films.
  const watch = media['watch/providers']?.results?.[region];
  const dedupe = (list: any[]) => {
    const seen = new Set<number>();
    return list.filter((p) => (seen.has(p.provider_id) ? false : seen.add(p.provider_id)));
  };
  const streamProviders = dedupe([
    ...(watch?.flatrate || []),
    ...(watch?.free || []),
    ...(watch?.ads || []),
  ]);
  const rentBuyProviders = dedupe([...(watch?.rent || []), ...(watch?.buy || [])]);
  const watchProviders = streamProviders.length ? streamProviders : rentBuyProviders;
  const watchLabel = streamProviders.length ? 'Where to stream' : 'Where to rent or buy';
  const watchLink: string | undefined = watch?.link;

  const metaParts: string[] = [];
  if (year) metaParts.push(String(year));
  if (runtime) metaParts.push(`${runtime} min`);
  if (!isMovie && media.number_of_seasons)
    metaParts.push(`${media.number_of_seasons} season${media.number_of_seasons > 1 ? 's' : ''}`);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) {
          setZoomed(false);
          onClose();
        }
      }}
    >
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (zoomed) {
            e.preventDefault();
            setZoomed(false);
          }
        }}
        className="max-h-[90vh] max-w-3xl gap-0 overflow-y-auto border-white/10 bg-[#15171f] p-0 text-text-primary [&>button]:right-3 [&>button]:top-3 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-black/60 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100"
      >
        {/* Backdrop */}
        <div className="relative h-40 w-full sm:h-56">
          {backdrop ? (
            <img src={backdrop} alt="" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-accent-blue/30 to-accent-purple/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#15171f] via-[#15171f]/50 to-transparent" />
        </div>

        <div className="relative px-5 pb-7 sm:px-8">
          {/* Poster + title */}
          <div className="-mt-20 flex flex-col gap-5 sm:flex-row sm:items-end">
            <img
              src={getPosterUrl(media.poster_path, 'w342')}
              alt={title}
              onClick={() => setZoomed(true)}
              title="Click to view full size"
              className="w-28 shrink-0 cursor-zoom-in rounded-lg shadow-2xl ring-1 ring-white/10 transition hover:ring-accent-blue/60 sm:w-36"
            />
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold leading-tight sm:text-3xl">
                {title}
              </DialogTitle>
              {media.tagline && (
                <p className="mt-1 text-sm italic text-text-secondary">{media.tagline}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs uppercase">
                  {isMovie ? 'Movie' : 'TV'}
                </span>
                {metaParts.map((p, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i === 0 ? <Calendar className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Ratings */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {tmdbScore && (
              <RatingPill
                label="TMDb"
                value={`${tmdbScore}`}
                href={tmdbUrl}
                className="bg-accent-blue/15 text-accent-blue"
              />
            )}
            {ratings?.imdbRating && (
              <RatingPill
                label="IMDb"
                value={ratings.imdbRating}
                href={imdbUrl}
                className="bg-amber-400/15 text-amber-300"
              />
            )}
            {ratings?.rottenTomatoes && (
              <RatingPill
                label="🍅 RT"
                value={ratings.rottenTomatoes}
                href={rtUrl}
                className="bg-red-500/15 text-red-300"
              />
            )}
            {ratings?.metascore && (
              <RatingPill
                label="Metacritic"
                value={ratings.metascore}
                href={metacriticUrl}
                className="bg-emerald-500/15 text-emerald-300"
              />
            )}
            {media.vote_count ? (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Star className="h-3 w-3" />
                {media.vote_count.toLocaleString()} votes
              </span>
            ) : null}
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-secondary"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          <div className="mt-5">
            <h3 className="mb-1 text-sm font-semibold text-text-primary">Overview</h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              {media.overview || 'No overview available.'}
            </p>
            {director && (
              <p className="mt-3 text-sm text-text-secondary">
                <span className="font-medium text-text-primary">
                  {isMovie ? 'Director' : 'Created by'}:
                </span>{' '}
                {director}
              </p>
            )}
          </div>

          {/* Cast */}
          {cast.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">Top cast</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {cast.map((person: any) => {
                  const photo = getProfileUrl(person.profile_path, 'w185');
                  return (
                    <div key={person.id} className="flex items-center gap-2">
                      {photo ? (
                        <img src={photo} alt={person.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xs">
                          {person.name?.charAt(0)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-text-primary">{person.name}</p>
                        <p className="truncate text-[11px] text-text-secondary">{person.character}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Where to watch */}
          {watchProviders.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <Tv className="h-4 w-4 text-accent-teal" /> {watchLabel}
              </h3>
              <div className="flex flex-wrap gap-2">
                {watchProviders.map((p: any) => {
                  const logo = getProviderLogoUrl(p.logo_path, 'w92');
                  return logo ? (
                    <img
                      key={p.provider_id}
                      src={logo}
                      alt={p.provider_name}
                      title={p.provider_name}
                      className="h-10 w-10 rounded-lg ring-1 ring-white/10"
                    />
                  ) : null;
                })}
              </div>
              {watchLink && (
                <a
                  href={watchLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-accent-blue hover:underline"
                >
                  View all options on TMDb
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-7 flex flex-wrap gap-3">
            {trailerUrl && (
              <a
                href={trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-accent-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/80"
              >
                <Play className="h-4 w-4" /> Watch trailer
              </a>
            )}
            <a
              href={`https://www.themoviedb.org/${isMovie ? 'movie' : 'tv'}/${media.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4" /> TMDb
            </a>
            {imdbId && (
              <a
                href={`https://www.imdb.com/title/${imdbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4" /> IMDb
              </a>
            )}
          </div>
        </div>

        {/* Full-size poster overlay — click anywhere to close */}
        {zoomed && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-6 sm:p-10"
            onClick={() => setZoomed(false)}
            role="button"
            aria-label="Close full-size poster"
          >
            <img
              src={getPosterUrl(media.poster_path, 'w780')}
              alt={title}
              className="max-h-full max-w-full cursor-zoom-out rounded-lg shadow-2xl"
            />
          </div>
        )}

        <DialogDescription className="sr-only">
          Details, ratings and cast for {title}.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default MovieDetails;
