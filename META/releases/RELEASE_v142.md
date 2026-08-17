# v142 — Merchant Trade activation

Merchant is promoted from deferred compatibility data into the selectable Forge Trade catalogue using the corrected Merchant workbook and synchronized book-rewrite Merchant canon.

## Runtime changes

- Adds Merchant as the twelfth complete selectable Trade.
- Uses candidacy `INT + KNO + PRE + POW >= 28, and KNO or PRE or POW 10+`.
- Sets Merchant distribution to 6,000 per 100K, matching Warrior; Rabble becomes 64,700 so the Trade distribution remains exactly 100,000.
- Adds Broker, Factor, Caravaner, and Port Factor as Merchant Professions.
- Adds the corrected Merchant baseline and Profession Attribute adjustments and grants.
- Preserves Merchant professional asterisks as player-facing maturity metadata. Merchant grants carry explicit `maturityRank`; acquired level uses the higher of Age Group Rank or Trade Rank and reduces the listed level by one for each remaining asterisk.
- Keeps package-calibration `Level - Stars/3` separate from player-facing acquired levels and pricing.
- Adds the Merchant Rank 0–10 title ladder: Clerk, Hawker, Agent, Trader, Merchant, Senior Merchant, Master Merchant, Commissioner, Trade Syndic, Exchequer, Grand Merchant.
- Restricts Mercantile Channel choices to the canonical Overland-trade and Sea-trade channels.
- Surfaces Favored of Iaxxil as a conditional Merchant rule. It is not added unconditionally to calculated Favor Dice.
- Updates visible Trade terminology from Trade/Specialization to Trade/Profession while retaining internal compatibility field names.

## Admin Tests / Info

- Replaces the Merchant-deferred diagnostic with current Merchant activation and maturity checks.
- Info identifies Merchant as active and lists subordinate choices as Professions.
- Existing unrelated diagnostic findings, including exact-name Lineage-reference problems, remain visible rather than being silently repaired by this release.

## Provenance

- Workbook: `sarna-len.characters_merchant-trade_maturity-corrected.xlsx`
- Book-rewrite: `book-rewrite_merchant-maturity-corrected_20260817.zip`
- Previous Forge: `dxd-chargen_v141_admin-tests-info-rebuild.zip`
