# TODO — Moviepedia

Working backlog for the site. Keep it short and honest: move things to **Done**
when they ship, delete stale ideas. Pair this with `BUGS.md` (things that are
broken) and `CLAUDE.md` (how the project works).

Conventions:
- `[ ]` not started · `[~]` in progress · `[x]` done (move to the Done section)
- Group by area. Add a one-line _why_ when the reason isn't obvious.

---

## Now / next

- [~] **TV premiere dates in favorites.** Use TMDb `next_episode_to_air` so the
  countdown targets the next season/episode instead of the series' original
  `first_air_date`. Label season premieres vs. regular episodes. _(in progress)_
- [ ] **Favorites: sort & filter controls.** Let the user sort by soonest
  premiere / recently added / title, and hide titles that are already out.
- [ ] **Favorites: "released since you added" badge.** Flag favorites whose
  premiere has passed so the user notices something is ready to watch.

## Favorites — ideas

- [ ] Persist a `Watched` / `Seen` flag and let the user archive watched titles.
- [ ] Optional browser notification / calendar (.ics) export for upcoming premieres.
- [ ] Show the streaming provider logo on the favorite row (where to watch).
- [ ] Export / import favorites as JSON (back up across browsers — no backend).

## Discovery & data

- [ ] Periodically refresh stale TV favorites in the background, not only when
  the panel opens, so countdowns stay current.
- [ ] Surface "returning soon" series in a dedicated browse mode.
- [ ] Revisit the `vote_count` floors in `tmdbService.ts` if good titles get hidden.

## Polish / tech debt

- [ ] Add a lightweight test setup (Vitest) for the date/countdown helpers.
- [ ] Audit accessibility of the detail modal and favorites sheet (focus traps,
      labels).

---

## Done

- [x] Favorites list with premiere countdown (movies + TV tabs, localStorage).
- [x] PWA / Add to Home Screen support.
- [x] OMDb ratings (IMDb / RT / Metacritic) with TMDb fallback + caching.
- [x] Country + multi-provider "New on Streaming" picker (default region NO).
