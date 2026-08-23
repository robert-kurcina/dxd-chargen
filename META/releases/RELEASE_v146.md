# v146 — Interdisciplinary Skill groups and restricted access

Synchronizes Character Forge with the 2026-08-23 `vault-sarnalen/book-rewrite` Interdisciplinary Skill refinement.

## Canon data

- Canonical groups are `§Academics`, `§Letters`, `§Doctrine`, `§Warfare`, `§Waycraft`, `§Commerce`, `§Courtcraft`, and `§Artistry`.
- `§Studies`, `§Teachings`, and `§Military` are legacy aliases normalized at runtime to `§Letters`, `§Doctrine`, and `§Warfare` respectively.
- Interdisciplinary Skills are Restricted. Access is granted by explicit Heritage, Culture, Trade, Profession, or package paths; ordinary elective Skills remain independently learnable.
- Each § level grants one elective selection. An elective may be selected twice; the second selection is Talented and is displayed with a `+` prefix.
- Runtime data records the accepted Test contract: direct purchased elective within group intent uses `DM +X/3`; a Talented elective can provide `DM +1` cross-support to another elective; at most one § group contributes to a Test.

## Character Forge

- Added centralized `src/data/interdisciplinarySkills.json` as the chargen representation of the vault contract.
- Additional Skill selection filters inaccessible Restricted § groups while leaving ordinary Skills unaffected.
- § elective controls enforce exactly X selections, a maximum of two selections per elective, and visible Talented (`+`) notation.
- Character-sheet projection preserves the `§` prefix and Talented elective notation so `§Warfare` remains distinct from ordinary `Warfare`.
- Legacy saved § group names are canonicalized during proficiency synchronization without rewriting historical source-sheet records.
- Heritage and Trade package data is migrated to the new signature paths, including Courtcraft, Commerce, Letters, and Warfare.
