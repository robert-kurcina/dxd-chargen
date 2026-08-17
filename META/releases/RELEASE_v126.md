# RELEASE v126 — Rapid Starting Gear / Optional Customize Split

- Continued `dxd-chargen` only. Character archives and book-rewrite remain deferred while the revised Armor editor is still being iterated.
- Separated the rapid Character Design sequence from the comprehensive equipment editors.
- **Assign Starting Gear** now presents the canonical Trade-based baseline package rather than the full Weapon, Armor, and Equipment catalogues.
- Starting Gear synchronizes automatically from the selected Trade and no longer requires an explicit Gear-review action to make the creation sequence ready.
- Removed random catalogue purchasing from the **Generate** action for Starting Gear. The baseline is a rules/package assignment rather than a shopping step.
- Added **7. CUSTOMIZE · Optional** to the Creation navigation with three independent substeps:
  - Customize Weapons
  - Customize Armor
  - Customize Equipment
- Optional Customize steps are excluded from required creation progress and final readiness validation. A character can therefore be completed without entering the comprehensive equipment editors.
- **Customize Weapons** now contains the comprehensive Weapon catalogue and current structured weapon controls.
- **Customize Armor** now contains the current Armor inventory plus the full Personal Armor editor, including Armor Set, Helmet/Shield/Gear, sectional decomposition, SIZ scaling, and aggregate calculations.
- **Customize Equipment** now contains the comprehensive Equipment catalogue and current structured equipment controls.
- The Starting Gear page shows both the canonical package intent and the currently assigned structured gear, making later customization visible without conflating it with the baseline package.
- New catalogue additions from optional customization are labeled `Customized Gear`; canonical Trade entries retain `Canonical Starting Gear` provenance.
- Adding another copy of an item already present in the canonical package now creates/updates a separate Customized Gear selection instead of silently increasing the canonical package quantity.
- Inventory catalogue integrity errors now route canonical failures to **Assign Starting Gear** and noncanonical failures to the appropriate Customize subsection.
- The existing v125 Sectional Armor parity ledger remains unchanged and pending for eventual book-rewrite parity.
