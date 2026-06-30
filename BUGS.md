# BUGS — Moviepedia

Defects found while using/testing the site. Keep entries concrete so they're
reproducible. When a bug is fixed, move it to **Fixed** with the commit/date.

Entry template:
```
### Short title
- **Where:** page / component / file
- **Steps:** how to trigger it
- **Expected:** what should happen
- **Actual:** what happens instead
- **Notes:** severity, suspected cause, screenshots
```

---

## Open

_Nothing open right now._

---

## Fixed

### TV favorites countdown stuck on "Out"
- **Where:** `FavoritesPanel` — TV / Upcoming
- **Steps:** Favorite an existing series (e.g. one that aired years ago) and open
  the favorites panel.
- **Expected:** Countdown to the next season/episode premiere.
- **Actual:** Showed "Out", because the stored date was the series' original
  `first_air_date`, which is in the past.
- **Fixed:** Enrich TV favorites with `next_episode_to_air` and count down to
  that; released series now live under the new Watchlist tab instead.
