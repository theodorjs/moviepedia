# Deploying Moviepedia

The site deploys automatically to **GitHub Pages** on every push to `main`, via
[.github/workflows/deploy.yml](.github/workflows/deploy.yml).

**Live URL:** https://theodorjs.github.io/moviepedia/

## How it works

- `vite.config.ts` sets `base: '/moviepedia/'` for production builds so asset
  paths resolve under the project subpath on GitHub Pages.
- The workflow installs dependencies with pnpm, runs `pnpm build`, and publishes
  the `dist/` folder to GitHub Pages.
- The TMDb/OMDb keys live in the committed `.env`. Because this is a client-side
  app, those keys are bundled into the public JavaScript regardless — committing
  them is exactly what makes the site work for every visitor with no extra setup.

## First-time setup

1. Push this repo to `https://github.com/theodorjs/moviepedia`.
2. Repo → Settings → Pages → "Build and deployment" → Source = **GitHub Actions**.
   (The workflow's `configure-pages` step also enables this automatically on the
   first run.)
3. The first push triggers the workflow; the site goes live in ~1–2 minutes.
   Watch progress under the repo's **Actions** tab.

## A note on OMDb quota

IMDb / Rotten Tomatoes / Metacritic ratings come from OMDb's free tier (1000
requests/day, shared across all visitors). The app caches results (memory +
`localStorage`) and falls back to the TMDb score when the quota is reached, so a
rating is always shown. For a public site with real traffic, consider OMDb's
$1/month tier (100,000/day): https://www.omdbapi.com/apikey.aspx

## Hosting elsewhere

`npm run build` produces static files in `dist/` that any static host can serve.
If you move off GitHub Pages, change `base` back to `'/'` in `vite.config.ts`.
