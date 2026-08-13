# Canon Sync v108 — Cherigili player-character restriction

This correction applies the explicit QA clarification received after v107.

- The canonical taxonomy remains Species → Ancestral Group → Lineage.
- Humaniki remains the active selectable Species.
- Human, Drauf, Alef, Klenari, Babbita, and Gnoan remain selectable Humaniki Groups.
- Cherigili remains present under Humaniki for reference, but it is not selectable or clickable for player-character creation.
- Cherigili Lines are displayed only when an imported legacy Cherigili draft is opened, and remain disabled.
- Kriket and Stonefolk remain visible but unavailable.
- Random/Generate Species selection excludes Cherigili, Kriket, and Stonefolk.
- Imported older Cherigili drafts are preserved rather than silently rewritten, but whole-character validation marks the Species step incomplete until a selectable Group/Lineage is chosen.

No character-data schema change was required; v108 remains CharacterDraft schema v7.
