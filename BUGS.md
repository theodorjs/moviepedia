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

### TV favorites countdown stuck on "Out"
- **Where:** `FavoritesPanel` — TV tab
- **Steps:** Favorite an existing series (e.g. one that aired years ago) and open
  the favorites panel.
- **Expected:** Countdown to the next season/episode premiere.
- **Actual:** Shows "Out", because the stored date is the series' original
  `first_air_date`, which is in the past.
- **Notes:** Being addressed via `next_episode_to_air` enrichment (see `TODO.md`).
  Leave here until verified live; then move to Fixed.

---

## Fixed

_None yet._
