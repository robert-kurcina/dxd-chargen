# dxd-chargen v133

Administration, Library metadata, Save confirmation, and Character Sheet editing refinements.

- Main navigation is now Forge / Sheet / Library. Tests and Info are moved to accordion sections on `/admin`.
- `/admin` adds cross-character Randomization, Library, Global Constraints, Tests, and Info categories.
- Randomization settings provide a deterministic global Forge seed and sequence position. Generate/Roll operations and Tragedy Seed resolution consume that sequence; developer Tests remain independent.
- Administrators define the Library tag vocabulary. Forge assigns those tags to characters; Library displays/filter only tags exposed by the administrator.
- `CharacterDraft.utilities.libraryTags` is normalized on migration and persisted by ordinary Save.
- Library Trade/Profession rendering falls back to persisted specialization IDs when a strict Trade-package specialization lookup fails. This restores `Wizard / Witch` for Alba and `Cleric / Cloister` for Twinkles without inventing package rules that are absent from the current machine-readable Trade packages.
- Save now opens an Approve / Cancel modal before filesystem write. Escape or clicking the modal backdrop cancels.
- Sheet Back Notes annotate catalog-recognizable Weapon, Armor, and Equipment Note lines with a smaller/lighter catalogue-property subline. These annotations are presentation-only; Notes remain mechanically inert and excluded from Weight/Cost/Burden calculations.
- Backstory is not catalog-annotated even though it shares the printed Back Notes area.
- The Sheet Back universal chart now uses fixed CSS Grid tracks corresponding to the printed columns and inter-column gaps. It no longer uses `margin-right` spacing that shifts adjacent cells.
