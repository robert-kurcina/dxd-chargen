# Canon Sync v111 — Inventory Normalization and Presentation

v111 formalizes the separation between canonical stored item names and character-sheet presentation names.

## Canonical storage

Assigned weapons, armor, and equipment resolve to the exact current catalogue name wherever a current catalogue item exists. Legacy character wording is an import alias, not an alternate canonical item name. Examples include `Medium Bow` -> `Bow, Medium`, `Broadsword` -> `Sword, Broad`, `Shortbow` -> `Bow, Short`, `Small Knife` -> `Knife, Small`, `Full Helm` -> `Helmet, Full`, `Boatcloak` -> `Cloak Or Cape`, and `Spellbook` -> `Blank Codex`.

Legacy possessions which are not current catalogue items are not invented as catalogue records. For the converted legacy characters, specified personal possessions are either moved to character Notes or removed according to the conversion decisions recorded in the character archive.

Character-specific conversion decisions include: Periwinkle's Alchemy kit and Dragon Sword (Flaming Soulbound) as Notes; Twinkles' Handful of Gems, Dragon Teeth x 2, and Prayer Beads +1 as Notes; Giovanna's Stun Poison x 3 as Notes; Moise's Telescope +3 as Notes; Illian's Robe of Armor as Notes with Lesser Staff/Lesser Staff of Power removed; Margiela's Poisoner's Awl as Notes; DJ's Wyvern egg as Notes; and Honri's fishing rod/tackle and Trapping Kit removed. Legacy Spellbooks for Periwinkle, Twinkles, Moise, Illian, DJ, and Stella are assigned as canonical `Blank Codex` equipment rather than Notes.

## Presentation only

`displayInventoryName()` is presentation-only. It does not change stored data. `Standard`, `Medium`, and `Average` are suppressed when they are default presentation qualifiers. Explicit lexical aliases override simple comma reversal: `Sword, Broad` displays as `Broadsword`; `Sword, Great` as `Greatsword`; `Bow, Short` as `Shortbow`; `Knife, Small` as `Small Knife`; `Helmet, Full` as `Full Helm`; `Helmet, Half Mantled` as `Half Helm & Mantle`; `Cloak Or Cape` as `Cloak or Cape`; and `Blank Codex` as `Spellbook`.

Size or type terms which are not presentation defaults remain visible unless an explicit alias says otherwise.

## Magic Item X

Magic Item catalogue definitions retain canonical names such as `Whetcoin X`. A character selection stores the selected X as `level`; when no X is specified, X defaults to 1. Presentation removes the suffix at X1 and prints the numeric value only above X1: `Whetcoin X`, level 1 -> `Whetcoin`; level 2 -> `Whetcoin 2`. Imported stacks may carry `quantity` separately from X, so ten X1 Gems of Radiance present as `10 × Gems of Radiance`.

The character-sheet projection, worksheet, and Magic Item selection summary use these display rules.
