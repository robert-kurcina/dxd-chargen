# v142 — Admin Tests / Info compatibility restoration

v142 corrects the over-narrow v141 Admin Tests/Info refactor. The v141 current-runtime diagnostics and current-data Info model remain authoritative, but useful pre-v141 interactive developer/reference behavior is restored beneath them.

## Tests

- Keeps the v141 deterministic Forge diagnostic layer and its pass/warn/fail totals unchanged.
- Restores the original interactive Military Unit Generator with Band, Squad, Group, Company, Detachment, Formation, and Division generation, nested personnel display, Trade Rank/title display, and aggregate salary totals.
- Restores the Salary/Contractor planner, Candidacy Expression evaluator, Heritage generator, Profession & Title generator, Settlement generator, Age generator, D66 lookup tools, Scalar/Index calculator, and Tragedy Seed generator.
- These tools are explicitly labeled Developer Tools and do not contribute to regression-test totals.
- Reconciles the restored generators where a current structured source exists: Heritage uses `heritagePackages`; Profession generation uses `tradePackages`; Military `Any` Trade selection uses current selectable `tradePackages` and therefore does not randomly generate deferred Merchant.
- `professions` remains a compatibility bridge for naming-practice and salary metadata used by these setting/developer utilities.

## Info

- Keeps the v141 runtime-oriented seven-phase Info page and Active/Bridge/Reference registry.
- Restores the pre-v141 reference explorer beneath it, including Military Hierarchy, Lineage/Age adjustments, Age/Attribute tables, Beliefs & Deities, Calculated Abilities reference prose, City States, Heritage source tables, Professions & Titles, Salary, Settlements, Species, Tragedy Seeds, Traits, Universal Table, and related reference sections.
- The restored explorer is explicitly labeled legacy/reference. It does not supersede current executable Forge rules or structured runtime datasets shown above it.

## Data policy

No `src/data` record is changed by v142. Existing semantic findings surfaced by v141 diagnostics, including Baminati/Baminat and Attribute-DM helper drift, remain visible rather than being silently corrected in this compatibility-restoration release.
