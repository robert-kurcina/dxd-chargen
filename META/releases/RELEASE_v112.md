# DXD Character Forge v112 — Residual Possession Cleanup

v112 completes the inventory normalization introduced in v111.

- Assigned Weapons, Armor, Equipment, and Magic Items must now resolve by both canonical name and `catalogId` to a runtime catalogue entry.
- Unresolved legacy possessions are moved to Notes instead of retaining synthetic/dangling catalogue IDs.
- Legacy quantity is preserved in Notes when meaningful.
- Duplicate history/sheet renditions are collapsed for Theo's throwing knives, Khao's Bansword/Banweapon representation, Illian's Bracers of Repulsion, and Periwinkle's Bracelet Armor.
- Existing canonical/presentation behavior remains unchanged, including `Spellbook` -> stored `Blank Codex` -> displayed `Spellbook` and Magic Item X presentation.
- Current character records were migrated to the same rule; their original source/provenance files remain unchanged.

No CharacterDraft schema-version bump is required.
