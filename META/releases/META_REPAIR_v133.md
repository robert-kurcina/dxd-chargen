# META Repair v133

Metadata-only archive repair. No runtime rules, catalogues, character data, application code, or provenance assets were intentionally changed.

- Removed three orphaned LLM prompt documents from `src/prompts/` and preserved them under `META/retired_llm_guidance/`.
- Retired `legacy-character-conversion.txt` from active guidance and preserved it with the other historical LLM instructions.
- Updated `META/guidance/blueprint.md` so its Current release description reflects v133 rather than v114.
- Moved Armor CSV audit/parity ledgers from `META/guidance/` to `META/releases/`, consistent with `META/README.md`.
- Updated metadata references to the moved Armor ledgers.
