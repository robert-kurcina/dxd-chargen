# Canon Sync — v105

v105 is the **Assign Utilities** functional tranche.

## Implemented

- Assign Spells uses the current Spell catalogue and records explicit starting selections with source/provenance.
- Assign Starting Gear uses the approved Weapons, Armor, and Equipment catalogues and compares cost against Personal Wealth.
- Assign Magic Items exposes only the previously approved complete-data runtime subset.
- Assign Name uses the incorporated conlang D66 generators through structured runtime data.
- Assign Relationships remains present in the canonical sequence but is deliberately deferred and non-blocking.

## Canon safeguards

- No new starting-Spell allotment was inferred where the normalized canon does not provide a deterministic rule.
- No Magic Item entitlement or price was inferred from incomplete source records.
- Items do not store individual throwing OR. They store Weight; Lob/Pitch/Hurl Method Indexes remain character calculations and throw OR is derived at use time.
- Generated names are suggestions from the existing conlang tables and remain editable.
- Existing decisions remain: Kriket unavailable pending age brackets; Merchant deferred; Deity selection unrestricted; demographic fine detail deferred.

## Draft schema

`CharacterDraft` advances from schema v5 to v6. It adds:

- quantity/price/Weight snapshots for starting inventory selections;
- explicit reviewed-state flags for Spells, Starting Gear, and Magic Items;
- naming Language and personal-ending style state;
- migration support from earlier draft schemas.

The presentation `CharacterSheet` remains a projection target rather than the canonical builder state.
