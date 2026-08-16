# DXD Character Forge v111 — Inventory Normalization

v111 separates canonical item storage from character-sheet presentation.

- Expanded legacy inventory aliases to resolve common character-sheet names to current catalogue records.
- Normalized legacy `Spellbook` assignments to catalogue `Blank Codex`, with `Spellbook` retained as the presentation name.
- Added explicit display aliases for established natural forms such as Broadsword, Greatsword, Shortbow, Small Knife, Full Helm, Half Helm & Mantle, and Spellbook.
- Preserved suppression of Standard, Medium, and Average as display-only defaults.
- Added Magic Item X presentation: X1 omits the number; X2+ prints the numeric value while the stored catalogue name remains `Foo X`.
- Added imported Magic Item quantity support so stack quantity remains distinct from X.
- Updated current legacy character records separately so designated noncatalog possessions are moved to Notes or removed rather than represented as invented catalogue entries.

No CharacterDraft schema-version bump is required; `quantity` is an optional imported-selection field and existing drafts remain valid.
