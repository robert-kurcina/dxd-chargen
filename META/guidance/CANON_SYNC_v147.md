# Canon Sync v147 — §Military and pricing audit

Source of truth: `vault-sarnalen/book-rewrite`, 2026-08-23 interdisciplinary pricing clarification.

- Canonical military group is `§Military`; ordinary `Warfare X > Category` remains separate.
- Legacy saved `§Warfare` normalizes to `§Military`. `§Studies` and `§Teachings` continue to normalize to `§Letters` and `§Doctrine`.
- Restricted § access has 0 Skillpoint equivalent and grants no Skill level. Actual § Skill levels use IM 4.
- Heritage, Trade, and Profession values are unchanged solely from the interdisciplinary taxonomy/access refinement because the affected Skill substitutions are IM-4-for-IM-4.
- Principal access paths remain centralized in `src/data/interdisciplinarySkills.json`.
- `societalHeritage.json`, `culturalHeritage.json`, `heritagePackages.json`, and Profession data embedded in `tradePackages.json` retain their existing price/calibration values for this revision; the recalculated §-specific delta is zero.
