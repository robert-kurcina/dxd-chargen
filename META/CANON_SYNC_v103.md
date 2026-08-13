# Canon Sync v103 — Character Forge Proficiencies

This release implements the current `book-rewrite` Assign Proficiencies sequence in the web Forge.

- Standard PCs default to PML 1; higher starting PML remains selectable subject to the canonical Age Rank floor.
- PML-derived Hitpoint, Favor, reserve, Recovery, Max Advantage, and Virtuosity milestone information is calculated from the current rules data.
- Advanced PML values that require Secondary Mutations or PML-linked psychological Disabilities remain recordable but produce explicit follow-up warnings; those mutation tables are not normalized into this tranche.
- Ancestry, Lineage, Heritage, Trade, Specialization, and PML grants remain source-recorded. Duplicate granted Traits are combined for presentation without destroying provenance.
- Broad Skill/Trait placeholders use known context (Region, Settlement, Deity, Belief, Environ, primary Language) where possible. Remaining specializations are explicit player inputs.
- Additional Skillpoints use the current Age Skillpoint curve, +10 per starting PML above 1, +10 per starting Trade Rank above 1, and selected Disability compensation.
- Purchased Attribute and ZED increases from Assign Intrinsics consume the same creation Skillpoint pool.
- Additional Skills use `IM × desired level`, with current free-purchase level-4/5 surcharges when no stronger source offsets them. The v103 UI caps ordinary starting purchases at level 5 rather than silently approving level 6+.
- Each character receives a free accented regional default Language and a free accented Heritage Language. Six explicit Citystate examples are stored as suggestions, not restrictions.
- Language proficiency points equal positive INT DM and are spent separately from general Skillpoints to improve a known Language, remove an accent at level 4+, or acquire another accented Language.
- The 17-language conlang catalogue remains the source for language and associated D66 name-generator identity.
- Package `stars` remain author-calibration metadata only and are never used to alter player-facing Trait levels or character-creation price.
