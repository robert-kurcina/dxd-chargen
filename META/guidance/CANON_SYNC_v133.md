# Canon Sync v133

This release changes application presentation, workflow, metadata, and administration. It does not change DXD character-building prices, Armor mechanics, Traits, or other game rules.

## Character metadata

`utilities.libraryTags` is cross-character Library metadata. Tags have no DXD mechanical effect. The administrator controls which labels are exposed by the Library interface; characters retain their assigned tag strings even if a tag is later hidden from the exposed vocabulary.

## Imported Trade/Specialization labels

The persisted imported character record remains authoritative for display when the current machine-readable Trade package catalogue does not contain an exact specialization record. In particular:

- Alba: `Wizard > Witch` (`specialization-wizard-witch`). The current Wizard package data does not define Witch mechanics.
- Twinkles: `Cleric > Cloister` (`specialization-cleric-cloister`). The current Cleric package data contains `Cloistered`, not the exact imported `Cloister` identifier.

Library display therefore falls back to the persisted specialization identifier. This is a presentation reconciliation only; it does not create or silently substitute Trade-package mechanics.

## Notes catalogue reference

When an unstructured Notes line corresponds to an existing Weapon, Armor, or Equipment catalogue entry, the finished Sheet may show that entry's catalogue properties beneath the Note in smaller/lighter text. The Note remains mechanically inert. The reference line must never add Weight, Price, Burden, combat capability, or ownership state to the character.

## Administration

The `/admin` page centralizes cross-character application settings and developer/reference material. Random seed/sequence and Library tags are implemented in v133. The Global Constraints category is reserved for future explicitly supported overrides; no DXD rule is overridden merely because the category exists.
