# Moviepedia — notes for Claude

Movie & TV discovery web app. **Client-side only** (no backend): Vite + React 18 +
TypeScript + Tailwind + shadcn/ui. Data from the **TMDb** API, with **OMDb** for
IMDb / Rotten Tomatoes / Metacritic ratings.

## Working with this repo
- This folder is the single source of truth. It was consolidated from an earlier
  iCloud working folder into the GitHub-Desktop clone — work and push from here only.
- Conversation with the maintainer (Theodor) is in **Norwegian**; the site UI text
  stays in **English**.
- Dev server: `npm run dev` (http://localhost:5173). Build: `npm run build`.
- Install deps with `npx pnpm@9 install` — the lockfile is pnpm and pnpm is not
  installed globally on this machine.

## Deployment
- Auto-deploys to **GitHub Pages** at https://theodorjs.github.io/moviepedia/ via
  `.github/workflows/deploy.yml` on every push to `main`.
- `vite.config.ts` sets `base: '/moviepedia/'` for production (root `/` in dev).

## Keys / config
- TMDb + OMDb keys live in the committed `.env` (`VITE_TMDB_API_KEY`,
  `VITE_TMDB_READ_ACCESS_TOKEN`, `VITE_OMDB_API_KEY`). This is intentional: Vite
  inlines `VITE_*` values into the public bundle anyway, so committing them is what
  makes the live site work for every visitor. They are low-value, client-exposed
  keys — rotate them if ever abused.

## Key behaviours
- Default watch region is Norway (`NO`); a country + multi-provider picker drives the
  "New on Streaming" mode.
- Lists apply a `vote_count` floor (`src/services/tmdbService.ts`) so results aren't
  dominated by low-vote regional titles.
- Cards show the IMDb rating (via OMDb, looked up by `imdb_id`) with the TMDb score as
  fallback. The detail modal shows TMDb / IMDb / Rotten Tomatoes / Metacritic, has a
  click-to-zoom poster, cast, trailer and "where to watch".
- OMDb free tier is 1000 req/day shared across all visitors; results are cached in
  memory + localStorage, and fall back to TMDb when the quota is hit.
