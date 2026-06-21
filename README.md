# Moviepedia

A dark-themed web app for discovering movies and TV shows — what's trending,
what's new in cinemas, what's coming soon, and what just landed on streaming.
Built on the [TMDb](https://www.themoviedb.org/) API, with
[OMDb](https://www.omdbapi.com/) for IMDb / Rotten Tomatoes / Metacritic ratings.

## Features

- **Browse & filter** by genre, time period (decades), and sort order, for both
  movies and TV shows.
- **Search** across movies and TV shows.
- **In Cinemas** and **Upcoming** movie views.
- **New on Streaming** — pick your country and the streaming services you
  subscribe to, and see recently released titles available on them.
- **Rich detail view** with backdrop, cast, genres, "where to stream", a trailer
  link, and ratings from TMDb, IMDb, Rotten Tomatoes and Metacritic.
- Balanced results: popular/discover queries use a vote-count floor so the lists
  aren't dominated by low-vote regional releases.

## Tech stack

Vite · React 18 · TypeScript · Tailwind CSS · shadcn/ui · TMDb & OMDb APIs.

## Getting started

```bash
npm install          # or: pnpm install
cp .env.example .env # then fill in your API keys
npm run dev          # http://localhost:5173
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_TMDB_API_KEY` | yes | TMDb data |
| `VITE_TMDB_READ_ACCESS_TOKEN` | optional | TMDb v4 read token |
| `VITE_OMDB_API_KEY` | optional | IMDb / Rotten Tomatoes / Metacritic ratings |

Get a TMDb key at <https://www.themoviedb.org/settings/api> and a free OMDb key
at <https://www.omdbapi.com/apikey.aspx>.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint

## Deployment

See [DEPLOY.md](DEPLOY.md) for Vercel, Netlify, and GitHub Pages instructions.

---

This product uses the TMDb API but is not endorsed or certified by TMDb.
