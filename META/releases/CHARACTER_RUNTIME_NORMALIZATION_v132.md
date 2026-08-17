# Character Runtime Normalization v132

All 23 completed character records now persist their established Trade in `utilities.startingGearTrade` and set `utilities.gearReviewed=true`.

This prevents dxd-chargen from interpreting an old null Starting Gear marker as a request to assign the current Trade package again. Existing inventory, Notes, source records, portraits, and provenance assets are otherwise retained from v131.

Validation found zero illegal worn Armor combinations under the v132 Suit/Helm/Shield/Gear and atomic occupancy rules.

Sir Bret Giles Franduik remains normalized to Cuirass, Metal + Helmet, Full + Shield, Medium, with Breastplate, Metal in Notes.
