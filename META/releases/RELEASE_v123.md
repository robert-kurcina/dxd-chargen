# RELEASE v123 — Structured Personal Armor Editor

- Replaced the flat Armor catalogue picker in Forge Starting Gear with a dedicated Personal Armor editor.
- Added three explicit workflows:
  1. Pick Armor Set.
  2. Pick Helmet, Shield, and Gear (one each).
  3. Customize Armor by Component using Sectional Armor entries.
- Normalized all 55 Armor catalogue rows with structured `armorKind`, material, affected Hit Locations, full-coverage Hit Locations, Suit classification, and canonical Armor Set metadata.
- Preserved the seven page-191 Armor Sets as canonical quick-picks rather than treating Light/Medium/Heavy/Field as materials.
- Helm, Shield, Gear, Sectional Armor, and Armor Set are now separate data categories in the Forge.
- Custom sectional Suits calculate Deflect, Armor Rating, Weight, Cost, coverage, and combined Traits from their selected components.
- Canonical Armor Sets retain their listed D/AR and the page-191 no-Hit-Location adjustment (+2 or +4 where specified).
- SIZ scaling is applied to Armor Sets, sectional components, Helmets, Shields, and Gear through the existing fitted-armor scaling rules; AR and Deflect remain unchanged by SIZ.
- Mail and Flex remain presentations of existing `[Mail X]` and `[Flex X]` traits. No Advanced/Bombproof/Bulletproof/Fireproof/Acidproof keywords were added.
- Existing character archives were intentionally not normalized in this release; that migration is deferred until the revised Armor editor has been iterated further.
