# DXD Character Generator — Data Integrity Patch

This is a path-preserving overlay for the current `dxd-chargen` project. Copy the contents over the repository root.

## Scope decisions applied

- Existing conlang D66 name generators are authoritative; no replacement name-generation system was invented.
- Kriket source data is retained, but Kriket is not exposed as a playable chargen species until a canonical age-bracket table exists. The supplied character workbook contains Kriket / Umber / Carnelian ancestry data but no Kriket age table.
- `magicItems.json` remains the source catalogue, but runtime chargen exposes only records with a nonblank form, availability, and substantive description. Placeholder-only entries remain preserved for future completion.
- Heritage packages are normalized from `sarna-len.characters(2).xlsx` into `heritagePackages.json` with explicit trait IDs, specializations, and acquired levels. Stars and package-value fields are retained only as author-calibration metadata.
- Language metadata and the existing D66 name generators are staged from `_conlang(2).zip`. Canonical spellings `Arikkah` and `Orukugu` are used in generated paths/data.
- Relationships, Merchant completion, and detailed demographic modeling are intentionally unchanged.
- Deity selection is unrestricted; no region/deity availability filter is added.
- Runtime catalogues receive deterministic `catalogId` values without replacing legacy fields such as Trait `Key` or numeric empire IDs.

## Added files

- `src/data/catalog-policy.ts`
- `src/data/heritagePackages.json`
- `src/data/languages.json`
- `src/data/name-generators/*.md`

## Replaced file

- `src/data/index.ts`

The replacement data index:

1. adds deterministic `catalogId` values to the major selectable catalogues;
2. disambiguates duplicate display names by deterministic source-order suffixes;
3. filters magic-item choices to complete playable records while preserving the raw source file;
4. exposes only species groups with a corresponding age-bracket table, currently omitting Kriket;
5. exports the normalized Heritage packages and language metadata.

## Validation

- 36 Heritage packages: 16 Environs, 10 Society, 10 Culture.
- 218 Heritage grants.
- 64 distinct Trait references; all 64 matched a canonical Trait template in the workbook during extraction.
- No invalid/nonpositive Heritage grant levels.
- 36/36 Heritage package IDs unique.
- 17/17 language IDs unique.
- 17/17 language entries resolve to an included D66 name-generator file.
- `catalog-policy.ts` passes TypeScript compilation.
- replacement `index.ts` passes TypeScript transpilation/syntax diagnostics in isolation.

## Integration note

The Markdown name-generator files are staged as static source data. A later UI/rules step can parse their D66 tables when the Name step is implemented; this patch deliberately does not invent a second generator format.
