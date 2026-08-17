# v141 — Admin Tests / Info rebuild

The legacy Admin Tests and Info implementations were replaced with views driven directly by the current Forge runtime data.

## Tests

- Separates deterministic regression diagnostics from interactive developer tools.
- Adds semantic cross-reference checks for runtime catalog IDs, selectable Species/Lineage adjustment resolution, Trade candidacy bridges, Merchant deferral, Heritage grant Trait resolution, language/name-generator/default links, settlement language links, Attribute creation data, PML data, and Armor sectional coverage metadata.
- Surfaces compatibility/reference-only drift as warnings rather than presenting legacy generators as current regression tests.
- Includes a warning when the inactive `calculateAttributeDM` helper diverges from the active runtime `getAttributeDm` helper.
- Keeps a small dice smoke tool, including the current 3D high-two Attribute roll method.

## Info

- Reorganized around the current seven Forge creation phases from `steps.json`.
- Uses structured `heritagePackages`, `tradePackages`, current Species runtime metadata, current language/name-generator/settlement data, PML data, physical scale, and normalized catalogues.
- Adds an Active / Bridge / Reference data registry so legacy datasets are not presented as authoritative runtime rules.
- Displays current diagnostic failures/warnings from the same semantic test layer.

## Data policy

No `src/data` records were changed in this release. Existing current-data inconsistencies are intentionally exposed by Tests/Info instead of silently corrected. In particular, v141 will report any exact-name Lineage adjustment mismatch such as the current Baminati/Baminat discrepancy.
