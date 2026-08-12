# dxd-chargen Canon Sync — v98

Authority: `book-rewrite` from `Sarna_Len_Book_Architecture_updated_2026-08-11_v98_Conlang_Outstanding_Concerns_Resolved(1).zip`.

This archive was reconciled against the iterated canon rather than treated as an independent rules source.

## Updated

- Canonical terminology and lineages: Sarukhen, Quagkh, Steppe, Gilvanar, Cherigili Restanoi; added Human Eniyaski and Pazkharan.
- Environ Heritage costs and exact environment lookup names.
- Character-creation Attribute IM schedule, kept separate from ordinary advancement IMs.
- Profession candidacy, per-100K distribution, Naming Practices, title table, salaries/Savings, and the Merchant Trade. Merchant candidacy/distribution remain null because Book III does not yet specify them.
- Social ranks and titles, including Tribal.
- Known Deity roster: removed conjoinments from the roster; corrected Fuala spelling in random tables.
- PML tier/titles, minimum Age Group table, Primary Mutation metadata, Favor/Hitpoint/Recovery/Max Advantage formulas, and calculated-ability descriptions.
- Trait catalogue entries/metadata identified by the v95 reconciliation and current individual trait definitions.
- Executable support logic for nullable profession candidacy and the separate Assign Intrinsics Attribute-cost schedule.
- Character sheet schema uses `pml` rather than the retired `level` field; the sample sheet was recalculated for current Hitpoints, Recovery Rate, Cellburn Limit, and Vasik Realms terminology.

## Deliberately retained

- Ordinary Attribute `im` values remain the in-play advancement schedule.
- Existing ancestry numeric adjustments were retained where they matched the v98 book-rewrite.
- `favoredTradesByLineage.json` remains derived support data; only canonical lineage keys were renamed. No Merchant or new-lineage probability weights were invented because the book-rewrite does not specify them.
- The explicit Ranger candidacy formula in Book III was retained despite nearby prose using a different Attribute set.

## Canon conflicts handled conservatively

- The generator uses the focused current Manapool rule (`ZED + SIZ DM`) rather than the stray older summary line that still says “SIZ plus Affinity.”
- The generator uses explicit PML formulas where a quick-reference row is inconsistent with the surrounding current rules text.
