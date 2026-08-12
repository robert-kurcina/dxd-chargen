# DXD Chargen v101 — Functional Background Phase

## Scope

v101 advances the v100 data-integrity release into the first genuinely interactive character-creation phase. The archive remains a complete application repository rather than an overlay patch.

## Implemented

- `ASSIGN BACKGROUND` now uses real draft state and source catalogues.
- Starting Region and Settlement are selectable; settlement randomization preserves the weighting encoded by duplicate entries in `settlements.json`.
- Demographics remains present but deliberately non-blocking under the approved scope.
- Age Group is selectable; exact age may remain provisional until Species is assigned.
- Culture, Environs, and Society Heritage use `heritagePackages.json` generated from `sarna-len.characters.xlsx`.
- Heritage grants are automatically projected into `CharacterDraft.proficiencies.granted` with `source: heritage` and package provenance.
- Heritage Stars remain author-calibration metadata only and never modify player-facing Trait levels.
- Social Rank uses the existing canonical table.
- Personality uses the 108 descriptor entries.
- Tragedy Seed can be selected or generated and is resolved through the existing D66 person/item/deity machinery.
- Disabilities can be selected or explicitly reviewed as None.
- Belief is selectable; Theists choose freely from all known Deities, with no regional restriction.
- Stable runtime IDs now also cover Background-selectable beliefs, disabilities, social ranks, tragedy seeds, and regions.
- CharacterDraft schema advances to v2 with migration from the v1 browser-local draft.

## Deliberate exclusions

- Kriket remains non-playable until canonical age brackets exist.
- Incomplete magic-item source records remain preserved but are filtered out of the runtime selectable catalogue.
- Merchant candidacy/distribution is not repaired here.
- Relationship rules are deferred.
- Fine-grained demographic probabilities and sex/gender/handedness mechanics are deferred.

## Packaging

The unused Firebase/Genkit starter layer was removed from the application and package dependencies. The archive provides:

- `run-local.sh` for macOS/Linux;
- `run-local.cmd` for Windows;
- `npm run validate:data`;
- `npm run typecheck`;
- `npm run build`;
- `npm run check`.

The normal start sequence remains `npm ci` then `npm run dev`.
