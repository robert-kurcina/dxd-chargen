# Data layout

- `characters/` — one folder per character, named by stable ID and character name. Each folder owns `character.json`, retained import sources, and its source/cropped portrait files.
- `decals/` — shared character-sheet decals served through the restricted data-assets route.
- `images/` — shared non-character image sources. Character portraits do not belong here.
- `maps/` — map and locale provenance documents.
- `peoples/` — structured setting data about peoples, reserved for canonical datasets.
- `world/` — structured world, region, settlement, and environs data.

The JSON modules under `src/data/` are a separate, build-time application catalogue.
