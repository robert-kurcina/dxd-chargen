# Canon Sync v112 — Residual Unmapped Possessions

v112 completes the v111 inventory-normalization rule: an assigned Weapon, Armor, Equipment, or Magic Item is structurally valid only when its stored `catalogId` and canonical stored name resolve together to an actual runtime catalogue record.

Legacy wording is first passed through the established normalization aliases. Presentation aliases do not count as storage mappings. If no exact runtime catalogue record remains after normalization, the importer does not create or retain a synthetic catalogue ID. The possession is removed from the structured assigned-item collection and retained in character Notes instead. This preserves the character's historical possession without inventing a canonical item or silently selecting among ambiguous catalogue variants.

This rule particularly affects legacy ammunition/container wording, underspecified sizes, and custom magic-item forms. Quantities are retained in Notes where meaningful. Duplicate legacy representations of the same possession are collapsed when they came from both the history list and detailed sheet table.

The v112 character migration moved 37 unresolved structured rows into 33 unique Note entries. Examples include `Fanny-pack`, `Cookbook`, `Jack Plate`, `Quiver of 24 Arrows`, `Arrow quiver`, `Arrows x 20`, `Small Bolt quiver`, `Small Bolts x 20`, `Pouch`, `Small sack`, `Tent`, `Bedroll`, and legacy custom/magic forms such as `Necklace of Courage 2`, `Magestick`, `Magewand`, `Bracelet Armor`, `Bracers of Repulsion`, `Bansword-2`, `Banhammer-2`, `Dagger of Stabbing`, and `Vorpal Sword`.

Where a separate canonical Magic Item already remains valid, only the unresolved physical/legacy rendition is moved to Notes. For example, the valid canonical Magic Item record can remain while an unmatched legacy weapon-form label is preserved in Notes.

`Spellbook` remains an explicit exception only in terminology, not in mapping: it normalizes to canonical Equipment `Blank Codex` and presents as `Spellbook`, so it remains a properly mapped assigned item.
