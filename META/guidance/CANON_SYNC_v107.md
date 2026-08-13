# Canon Sync — v107 QA Corrections

v107 reconciles the post-v106 Forge QA correction specification with the current Sarna Len character-creation canon.

## Demographics

Demographics is restored as a required Background step. It records Sex, Gender, Handedness, Age Group/Rank, exact Age, and Birth Month. A separate Genetically Female switch is available for non-Male Sex and activates the structured female Attribute, physical, Trait, and managed-concern adjustments.

Age Group now immediately recalculates Age modifiers, required Disabilities, Heritage maturity grants, Humaniki maturity grants, Intrinsics, and derived Properties.

## Sophont hierarchy

The Forge now represents the canonical hierarchy explicitly:

- Species: Humaniki, Kriket, Stonefolk;
- Humaniki Ancestral Groups: Human, Drauf, Alef, Klenari, Babbita, Gnoan, Cherigili;
- Lineage / Line below the Group.

Humaniki is selectable. Kriket and Stonefolk are retained visibly but disabled for current character creation. `Cher-gulo` is a language name and is not treated as an Ancestral Group; Cherigili remains the explicitly listed Humaniki Group.

## Maturity versus author calibration

Heritage `maturityStars` are now separate from XLSX `authorCalibration.stars`.

- `maturityStars` reproduce the asterisks printed in the canonical Environ, Society, and Culture Talent tables and are consumed by the Age Group acquisition rule.
- `authorCalibration.stars` remain the package-balancing metadata previously approved for author design and are never used as character Trait levels, maturity penalties, or Skillpoint prices.

Ancestry maturity likewise uses the actual asterisks in its source Talent strings and the higher of Age Rank or PML.

## Capability presentation

Heritage, Species/Group/Lineage, and Profession grant blocks are shown separately with live overlap underlining. Final/compressed Skills and Traits follow the duplicate rule: retain the highest listed level and add +1 for each duplicate source, while preserving Broad Skill specializations.

Broad Skill specialization choices now live on each capability row. A capability of level X permits up to X specialization selections; repeated selections are displayed as specialization rank.

## Wealth and Magic Items

Wealth shows Personal Wealth and nominal Assets. Valuables use 10× Personal Wealth and Lands use 100× Personal Wealth.

Magic Item grade presentation uses the canonical worth multipliers:

- Common ×10;
- Lesser ×100;
- Greater ×1,000;
- Wondrous ×10,000;
- Legendary ×100,000.

Selected-item rarity multiplies; displayed equivalent gp values add. Approved interchangeable form-factor families can be changed without changing the magic effect.

## UX

The Forge header is sticky. Major vertical sections are persistent localStorage-backed accordions. Each Assign step shows a top Generate control, disabled when generation is not meaningful or currently illegal. The live Character panel is expandable and projects current Attributes, calculated scores, resources, compressed Skills/Traits, identity, and unresolved status immediately from upstream edits.
