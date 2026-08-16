# DXD Character Forge v113 — Expendable Notes

- Ordinary ammunition purchase packages remain in the catalogue but become plain editable Notes when assigned.
- No consumable/resource datatype was added; Notes remain unstructured and mechanically inert.
- Ammunition catalogue presentation uses quantity-first natural English, e.g. `Arrow × 10` -> `10 x Arrows`, including in the catalog browser.
- Adding ordinary ammunition from the catalog writes a plain Note instead of a structured inventory row; no consumable datatype or mechanical tracking is introduced.
- Historical quiver/case records were split into canonical containers plus ammunition Notes where appropriate.
- `Bedroll` now maps to `Bed roll, Simple`; single Pouch/Small Bag possessions remain Notes rather than being conflated with ×10 catalogue packages.
- `Skill Book` is normalized to catalogue `Skill Tome`; Honri's historical Cookbook is the plain Note `Skill Tome (Cook)`, reflecting `Labor > { Cook }`.
- Removed the embedded `❶` glyph from canonical Magestick weapon names and updated aliases/starting gear.
- Current character records were migrated while source/provenance files remain unchanged.

No CharacterDraft schema-version bump is required.
