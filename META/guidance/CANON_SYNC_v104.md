# Canon Sync v104 — Assign Properties

v104 implements the two **Assign Properties** steps in the Character Forge.

## Sources used

- Current iterated book-rewrite: `book-rewrite/02_Master_Manuscript_Entries/03_Character_Creation.md`.
- Character design workbook: `sarna-len.characters.xlsx`, especially `ATTR-ANCESTRY`, `ATTR-TRADE`, and `CALCULATIONS`.
- Existing DXD character-sheet implementation was consulted only for compact CRS compatibility fields that are not restated in the current Book III Properties section.

## Physical derivation

The Forge now derives numeric Stature and Build, then uses the canonical 0–99 Height/Weight/SIZ lookup table. The calculation order is:

1. Species baseline Stature.
2. Lineage, Age Group, Heritage, Trade, and Specialization Stature adjustments.
3. STR DM.
4. Build begins from final Stature.
5. Species/Lineage/Age/Heritage/Trade/Specialization Build adjustments.
6. FOR DM − REF DM and Brawn.
7. Optional Underweight/Overweight adjustment.
8. Height is looked up from Stature; Weight and SIZ from Build.
9. Profile = floor((Stature + Build) / 2).

Sex-specific physical adjustments are not automated in v104 because demographic fine detail remains outside the current approved implementation scope.

## Age-table reconciliation

The current governing Age Group characteristic table says **Child Build +4**. A later worked Vanyrai Alef example says **Child Build +5**. v104 follows the governing table and retains `characteristicModifiers.json` at +4 rather than changing the rule from the isolated worked example.

## Underweight / Overweight

The optional adjustment is stored as −9 through +9 Build. Positive values are Overweight and negative values are Underweight. When Overweight, Bodypoints use SIZ from the pre-Overweight Build as specified by the current rules.

## Calculated Properties

Implemented from the current Properties rules and synchronized project canon:

- SIZ, Profile, Hitpoints, Bodypoints, Recovery, Physicality;
- Gasp Limit, Sleep Limit, Max Advantage;
- Lob, Pitch, and Hurl Method Indexes;
- Lift, Shoulder, Carry and maximum-effort values;
- Upward, Broad, Downward and running-jump references;
- Walk, Jog, Run, and MOV;
- Endurance, Resilience, Resistance;
- Favor dice, Manapool, Cellburn Limit.

Trait adjustments currently included where the rule is explicit: Brawn, Thrower, Leap, Sprint, Athletics, v-Focused, Affliction, Prissy, Zucked, Deity, v-Regenerate, and Robust.


## ZED recorded-roll correction

v104 corrects an inherited v102 implementation inconsistency. The character's Affinity candidate was already selected from the recorded Attribute Rolls, but the final ZED calculation still used the adjusted Attribute value. Current Book III explicitly requires ZED to begin from the recorded Attribute Roll and states that Species, Lineage, Trade, Specialization, and ordinary Attribute adjustments do not replace that natural Affinity value. ZED now uses the recorded roll, then applies only explicit ZED adjustments and any purchased ZED increase.

## Direct MOV adjustments

The body-derived movement formula produces Walk, Jog, and Run, with Run becoming MOV. Playable-Sophont adjustment tables also contain direct MOV offsets. v104 applies those Species, Lineage, Age, Trade, and Specialization MOV offsets to the derived Run value before Sprint, rather than discarding them or treating MOV as one of the nine rolled Attributes.

## Manapool reconciliation

v104 uses the established project rule **Manapool Index = ZED + SIZ DM**, reduced by Zucked where applicable. This is consistent with the dedicated ZED/Manapool rule and `calculatedAbilities.json`. A later shorthand line in Assign Calculations saying “SIZ plus Affinity” is not used to replace that established formula.

## Throwing invariant

The character stores Lob/Pitch/Hurl Method Indexes only. Inventory does not store a separate per-item throwing OR. At the moment an object is thrown, OR is derived from the chosen Method Index and the object's indexed Weight according to the method rule. Pitch remains the default method.

## CRS compatibility fields

Hasty Actions, Melee Attack/Defend, and Range Attack/Defend remain available as compact character-record-sheet compatibility values using the established creator projection. They are labeled as compatibility values rather than presented as new Book III Properties rules.

## Draft schema

`CharacterDraft.schemaVersion` is now 5. Properties retain typed Stature, Build, pre-weight-adjustment Build, weight adjustment, Height, Weight, SIZ, Profile, and a calculated-value map. v4 browser drafts migrate automatically. Removing an upstream prerequisite clears stale calculated Properties rather than leaving obsolete values in the draft.
