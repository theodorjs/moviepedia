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
- [ ] **Verify TV "Upcoming" against live TMDb.** The returning-season-premiere
  detection enriches a popularity pool via detail calls; sanity-check coverage
  and tune the candidate count / date window.

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

## Polish / tech debt

- [ ] Add a lightweight test setup (Vitest) for the date/countdown helpers.
- [ ] Audit accessibility of the detail modal and favorites sheet (focus traps,
      labels).

---

## Done

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
