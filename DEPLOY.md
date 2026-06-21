# Deploying Moviepedia

This is a static Vite + React single-page app. `npm run build` produces a
`dist/` folder of static files you can host anywhere.

## Required environment variables

Set these in your host's dashboard (they are read at build time, so they must
exist **before** the build runs). The same names are listed in `.env.example`.

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_TMDB_API_KEY` | yes | TMDb API key |
| `VITE_TMDB_READ_ACCESS_TOKEN` | optional | TMDb v4 read token |
| `VITE_OMDB_API_KEY` | optional | Enables IMDb / Rotten Tomatoes / Metacritic ratings |

> Note: because this is a client-side app, `VITE_*` values are bundled into the
> public JavaScript. TMDb/OMDb keys used this way are visible to anyone — that's
> expected for these APIs, but don't reuse a key you consider secret.

## Option A — Vercel (recommended, zero config)

1. Push the repo to GitHub.
2. On vercel.com → "Add New Project" → import the repo.
3. Vercel auto-detects Vite (`vercel.json` is included). Add the env vars above.
4. Deploy. Every push to the main branch redeploys automatically.

## Option B — Netlify

1. Push the repo to GitHub.
2. On netlify.com → "Add new site" → import the repo.
3. Build settings come from `netlify.toml` (build `npm run build`, publish `dist`).
4. Add the env vars above under Site settings → Environment variables. Deploy.

## Option C — GitHub Pages

GitHub Pages serves a project repo from a subpath (`/<repo-name>/`), so:

1. In `vite.config.ts` add `base: '/<your-repo-name>/'`.
2. Add a GitHub Actions workflow that runs `npm ci && npm run build` and
   publishes `dist/` (e.g. with `actions/deploy-pages`). Set the env vars as
   repository secrets/variables.
3. Enable Pages (Settings → Pages → Source: GitHub Actions).

Vercel or Netlify are simpler because they serve from the domain root and need
no `base` change.
