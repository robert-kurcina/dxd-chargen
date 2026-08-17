# CANON SYNC v132 — Established Gear and Runtime Armor Invariants

## Starting Gear

`Assign Starting Gear` is the baseline package for rapid character creation. A completed imported character already has an established equipment state; a missing legacy `startingGearTrade` field must not be interpreted as permission to inject the Trade package again.

For completed imported characters, the normalized Trade name is persisted in `utilities.startingGearTrade` and `gearReviewed` is true. New characters continue to use the normal Starting Gear assignment/reset workflow.

## Worn Armor invariant

The following rules must hold at storage, browser hydration, normal Forge synchronization, Character Sheet projection, and Burden calculation:

- Armor Set and Sectional Suit are alternate representations of the Suit slot and cannot coexist.
- A detailed Sectional Suit supersedes a conflicting abstract Armor Set.
- Only one Helm, one Shield, and one Gear layer may be worn.
- Sectional Armor and Helm occupancy may not overlap except at Left/Right Elbows and Knees.
- One-sided sectional pieces resolve atomic occupancy using their selected Left/Right side.
- Conflicting physical armor becomes mechanically inert Notes during draft normalization; a losing Armor Set is discarded as redundant abstraction.

The Character Sheet and carried-weight projection also resolve worn Armor defensively. Illegal legacy state therefore cannot be rendered or weighed as simultaneously worn even before persistence is rewritten.

## Sir Bret Giles Franduik regression case

The legal worn Armor result is:

- Cuirass, Metal
- Helmet, Full
- Shield, Medium

`Breastplate, Metal` remains in Notes as owned but not worn. `Armor Set, Heavy (Reinforced + Plate)` is a redundant abstract Suit and is not retained as a second object. A stale Canonical Starting Gear Breastplate or Large Shield cannot appear as simultaneously worn armor.
