# RELEASE v127 — Sectional Armor Occupancy

- Continued `dxd-chargen` only. Character archives and book-rewrite remain deferred.
- Added author-defined granular body occupancy to all 67 Sectional Armor records and all 7 Helm records.
- Enforced no-overlap selection for outer Sectional Armor and Helms, with Elbows and Knees as the only permitted overlap regions.
- Added explicit Left/Right instances for one-side components (`× 1` Sleeves, Pauldrons, Manicas, and derived equivalents).
- Removed quantity-based editing from new sectional selection; each detailed component is now represented as one physical component/side.
- Added compatibility handling for legacy v125/v126 one-side selections and prompts when a side is unresolved.
- Added current-state diagnostics for pre-existing overlaps rather than silently modifying imported characters.
- Integrated the author-supplied `hit-locations.svg` into Customize Armor; male/female semantic layers are selected from the character and occupied regions are highlighted.
- Gear remains a separate under-armor layer; Shields remain mobile and do not consume body occupancy.
- Rebuilt all seven optional Armor Set decomposition examples to avoid forbidden overlap. Cuirass + Breastplate and similar layered duplicate coverage is no longer proposed or selectable.
- Corrected runtime structured `Backplate, Metal` body-part metadata to `Back Torso`.
- Aggregate custom Suit D/AR calculations now group sectional protection by actual left/right Arm and Leg rather than allowing multiple pieces on one limb to masquerade as multiple Hit Locations.
- Added `ARMOR_OCCUPANCY_PARITY_v127.csv` for later book-rewrite parity.
