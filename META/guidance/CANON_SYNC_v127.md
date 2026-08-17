# Canon Sync v127 — Granular Armor Occupancy

## Decision

Keep Armor Sets as optional DXD abstractions, but make detailed Sectional Armor obey explicit physical occupancy when the user enters **Customize Armor by Component**.

## Granular occupancy

- The attached author-defined Hit Location vocabulary is the runtime occupancy vocabulary for Sectional Armor and Helms.
- Outer Sectional Armor and Helms may not occupy the same granular body region.
- **Elbows and Knees are the only overlap exceptions.**
- One-side components such as a Pauldron, Sleeve, or Manica must be assigned Left or Right.
- Gear remains a distinct under-armor layer and does not participate in outer sectional collision checks.
- Shields remain mobile and consume no body region.
- Hit Locations remain optional for play; occupancy exists to keep detailed customization physically coherent, not to make granular combat mandatory.

## Forge behavior

- Invalid choices are disabled before selection where possible.
- Existing legacy overlaps are reported instead of silently rewritten; character archive normalization remains deferred.
- The author-supplied male/female SVG is included as the detailed coverage visual and is driven by the same semantic atom names used by the constraints.
- The Backplate structured body-part label is normalized to `Back Torso` in runtime catalog data.
- Suggested Armor Set decompositions were rebuilt so they contain no forbidden overlap.

## Deferred book parity

No book-rewrite changes in v127. `META/releases/ARMOR_SECTIONAL_PARITY_v125.csv` remains the ledger for added sectional records. `META/releases/ARMOR_OCCUPANCY_PARITY_v127.csv` records the granular coverage/side metadata to be reconciled into the book-write armor tables and guidance after the editor stabilizes.
