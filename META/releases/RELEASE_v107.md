# DXD Character Forge v107 — QA Corrections

## Scope

v107 applies the supplied post-v106 QA correction specification without changing the established complete-project/runnable-archive contract.

## Major corrections

- restored canonical Demographics inputs and Genetically Female application;
- moved Age Group, exact Age, and Birth Month into Demographics;
- corrected Species → Ancestral Group → Lineage taxonomy;
- Humaniki selectable; Kriket and Stonefolk visible but disabled;
- canonical maturity asterisks separated from XLSX author-calibration Stars;
- age-sensitive Heritage and Humaniki grants recalculate live;
- required Disability count/generation/re-roll/manual review;
- sticky Heritage, biological, and Profession grant summaries with overlap marking;
- Broad Skill specialization controls moved onto capability rows;
- Additional Skills shows current compressed capabilities and permits purchasable Skills/Traits;
- Spells gated by effective v-Magic;
- Wealth shows Personal Wealth plus Valuables/Lands Assets;
- Starting Gear shows remaining/original Personal Wealth;
- Magic Item search is label-only, form families are selectable, and grade rarity/value totals are shown;
- sticky Forge header, persistent accordion state, top Generate controls, and expanded live Character panel.

## Draft migration

CharacterDraft schema advances from v6 to v7. Existing v6 drafts migrate without losing character/library state. New fields cover Demographics, Species family, specialization-rank maps, and Magic Item form overrides.

## Validation policy

The dependency-free rules/data layer, syntax/transpilation, local import resolution, runtime rule smoke tests, package/lock synchronization, `git diff --check`, launch scripts, and fresh ZIP extraction are release gates. A clean npm install and Next production build are attempted separately; the generation sandbox may fail those only because npm registry tarballs are unavailable at its network boundary.
