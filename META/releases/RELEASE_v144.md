# v144 — Library/Admin character loading and disposition index

Implements the character-library and administration presentation refinements requested for filesystem characters.

## Runtime changes

- Forge and Sheet show the active filesystem Filename in the sticky workspace header whenever a saved character is loaded.
- Library saved-version history now shows each version filename and uses an explicit far-right **Load** button; version rows themselves are no longer clickable load targets.
- Admin navigation places **Characters** first and `/admin` redirects to `/admin/characters`; Global remains available at `/admin/global`.
- Admin > Characters now exposes the same explicit Load/version-history behavior as Library, including version filenames and an Admin-to-Forge load handoff.
- Tags are filterable with a free-text input in desktop and mobile Library/Admin views instead of the former `All tags` dropdown. Tag editing remains independent of filtering.
- Admin > Characters adds a sortable **Temperance** column. Temperance is `Ameliorative − Distressing` and is displayed as `T (A/D)`, for example `-1 (2/3)`.
- Admin Characters defaults now include Portrait, Character Name, Tags, Temperance, and Filename.

## Data behavior

- The character-files metadata endpoint derives Distressing and Ameliorative counts through the existing runtime `capabilityDispositionCounts` calculation, then exposes Temperance from those counts.
- Version metadata exposes `character.json` for the current version and the actual archived JSON filename for each saved version.
