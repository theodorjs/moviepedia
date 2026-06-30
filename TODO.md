# TODO — Moviepedia

Working backlog for the site. Keep it short and honest: move things to **Done**
when they ship, delete stale ideas. Pair this with `BUGS.md` (things that are
broken) and `CLAUDE.md` (how the project works).

Conventions:
- `[ ]` not started · `[~]` in progress · `[x]` done (move to the Done section)
- Group by area. Add a one-line _why_ when the reason isn't obvious.

---

## Now / next

- [ ] **Favorites: "released since you added" badge.** Flag favorites whose
  premiere has passed so the user notices something is ready to watch.
- [ ] **Watchlist: more "group by" options** (decade, status, watch provider).

## Favorites — ideas

- [ ] Persist a `Watched` / `Seen` flag and let the user archive watched titles.
- [ ] Optional browser notification / calendar (.ics) export for upcoming premieres.
- [ ] Export / import favorites as JSON (back up across browsers — no backend).
- [ ] Watchlist: secondary genres (a title shows under each of its genres, not
  just the primary one) as an optional view.

## Discovery & data

- [ ] Periodically refresh stale favorites in the background, not only when
  the panel opens, so countdowns/providers stay current.
- [ ] Revisit the `vote_count` floors in `tmdbService.ts` if good titles get hidden.
- [ ] **OMDb quota / IMDb reliability.** Each card fetches OMDb per title; effects
  fire twice (StrictMode in dev) and rapid scroll can race, so the same id is
  fetched more than once before the cache is warm. Add in-flight de-duplication
  in `fetchOmdbRatings` / `fetchImdbId` to roughly halve calls and keep the free
  1000/day quota from being exhausted (when it is, every card falls back to TMDb).
- [ ] **Decide the no-IMDb-rating display.** Unreleased/brand-new titles have no
  IMDb score yet, so cards correctly fall back to the TMDb star. Decide whether to
  keep that, hide the star, or label the source (IMDb vs TMDb) so it's unambiguous.

## iOS app (next phase — native SwiftUI)

Decision: build a native SwiftUI app for iPhone + iPad (most-native feel). Run the
build/simulator loop locally (Xcode required). Suggest a **separate `moviepedia-ios`
repo**; this web repo stays the source of truth for the web app.

- [ ] One-time manual setup in Xcode (Theodor): create iOS App (SwiftUI), sign in
  with Apple ID, pick team (automatic signing), trust dev cert on device.
- [ ] v1 scope = mirror the web app: browse/trending grid + search; detail view
  (TMDb / IMDb / RT / Metacritic, cast, trailer, where-to-watch); Favorites =
  Upcoming (premiere countdown incl. TV `next_episode_to_air`) + Watchlist (sort +
  group by genre, provider logos). Default region NO; reuse TMDb + OMDb keys; cache
  OMDb responses.
- [ ] Architecture: `TMDBClient` / `OMDBClient` (async/await, URLSession), `Codable`
  models, `FavoritesStore` (`@Observable` + UserDefaults/file), `TabView` UI, keys
  via `.xcconfig`/Secrets. Build data layer first, verify against a real TMDb call,
  then grid → detail → favorites.
- [ ] Distribution: $99/yr Apple Developer Program only needed for App Store. For
  personal use, the PWA installs free, or use free provisioning (re-install every
  7 days).

## Polish / tech debt

- [ ] Add a lightweight test setup (Vitest) for the date/countdown helpers.
- [ ] Audit accessibility of the detail modal and favorites sheet (focus traps,
      labels).

---

## Done

- [x] **Verified TV "Upcoming" against live TMDb + tuned `fetchUpcomingTv`.**
  Returning-season-premiere detection works (e.g. SVU S28, Chicago Fire S15).
  Switched the brand-new-series query from `first_air_date.asc` to
  `popularity.desc` so recognizable titles surface instead of obscure regional
  ones (unaired series have ~0 votes, so a vote floor can't be used).
- [x] **TV "Upcoming" on the main page.** TV now has an Upcoming mode (like
  movies) showing brand-new series premiering soon plus returning series with a
  season premiere coming up (via `next_episode_to_air`).
- [x] **Watchlist polish.** Streaming-provider logos on each row; sort/group
  choice remembered across visits; removed the title counts on the Movies/TV tabs.
- [x] **Favorites menu reworked into Upcoming + Watchlist** (bottom nav), with
  Movies/TV split kept in both. Watchlist sorts by release date / rating /
  runtime / title and groups by genre.
- [x] **TV premiere dates in favorites.** Countdown targets the next
  season/episode via TMDb `next_episode_to_air` (falls back to `first_air_date`
  for new series); labels season premieres vs. regular episodes.
- [x] Favorites list with premiere countdown (movies + TV tabs, localStorage).
- [x] PWA / Add to Home Screen support.
- [x] OMDb ratings (IMDb / RT / Metacritic) with TMDb fallback + caching.
- [x] Country + multi-provider "New on Streaming" picker (default region NO).
