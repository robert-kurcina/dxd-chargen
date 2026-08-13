# Canon Sync — v106

v106 is the **Finalization and Character Library** functional tranche built on v105.

## Scope

- no new Sarna Len gameplay rule is introduced;
- existing canonical step assessments are aggregated into whole-character validation;
- the finished Character Record Sheet is a deterministic presentation projection of `CharacterDraft`;
- Relationships remain deferred and non-blocking under the established scope decision;
- incomplete Magic Items and Kriket remain excluded under the existing runtime policies;
- per-item throwing OR remains absent from inventory; Weight and the character's Lob/Pitch/Hurl Method Indexes remain the stored values.

## Finalization

`src/lib/rules/finalization.ts` evaluates every configured creation step and distinguishes:

- blocking incomplete/error state;
- resolved steps carrying warnings;
- complete steps;
- stale imported catalogue references which must be repaired before the character is treated as ready.

Warnings are preserved and visible but do not by themselves prevent the character from being `Ready`.

## Finished CRS projection

`src/lib/character-sheet-projection.ts` projects the active draft into the existing CRS presentation model. The projection includes:

- all 12 Attributes and DMs;
- selected Affinity placement;
- PML, Species/Lineage, Heritage, Age, Trade, Settlement, Belief/Deity, and Personality;
- consolidated Skills and Languages;
- Spells, complete Magic Items, Weapons, Armor, and Equipment;
- calculated performance, concern capacities, combat DMs, Wealth/Social/Trade ranks, Favor, Cellburn, and Manapool.

The sheet is not a second source of truth.

## Character Library

The browser-local library is versioned independently from `CharacterDraft`.

- storage key: `dxd-character-library-v1`;
- the prior single-draft key remains written for backward compatibility;
- on first v106 launch, an existing v105 single draft is promoted into a one-character library;
- New, Open, Duplicate, Delete, Export, Import, Edit, and Open Sheet are supported;
- deleting a character affects only the local browser copy;
- JSON export preserves the complete structured draft rather than flattened sheet text.

## Printing

The live Sheet tab includes **Print / Save PDF** and print-specific layout rules. This relies on the browser print system and does not add a separate PDF rules representation.
