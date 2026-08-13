# Canon Sync v102 — Character Forge Intrinsics

This release implements the current `book-rewrite` Assign Intrinsics sequence in the web Forge.

- Only CCA, RCA, REF, INT, KNO, PRE, POW, STR, and FOR are generated as Attribute Rolls.
- The recorded Attribute Roll remains distinct from Species, Lineage, Trade, Specialization, Age, and purchased adjustments.
- Trade candidacy evaluates against recorded rolls plus Species/Lineage Attribute adjustments only in the current scoped build (Sex detail is intentionally deferred).
- ZED uses the highest recorded Attribute Roll in the selected Trade's Critical Attribute set; ties remain a player choice.
- Changes to the Affinity Attribute propagate to ZED. Direct ZED package adjustments remain separately sourced.
- Wealth is deterministic from Heritage Wealth + final KNO DM + applicable starting Citystate economy adjustments.
- `tradePackages.json` is normalized from `sarna-len.characters(2).xlsx`. `stars` is retained only as author-calibration metadata and is never used as the player-facing Trait level or character-creation price.
- Kriket and Merchant remain deferred from selection under the current scope decisions without deleting their source records.
