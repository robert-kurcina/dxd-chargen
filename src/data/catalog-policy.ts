/**
 * Canonical static-data policy for the character builder.
 *
 * The source JSON remains readable/editable canon data. Runtime catalogues are enriched
 * with deterministic catalogId values so CharacterDraft can retain stable references
 * instead of relying on display text or legacy lookup keys.
 */

export function slugifyCatalogId(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/§/g, 'section ')
    .replace(/&/g, ' and ')
    .replace(/>/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function makeCatalogId(namespace: string, label: string): string {
  return `${slugifyCatalogId(namespace)}-${slugifyCatalogId(label)}`;
}

/**
 * Adds deterministic IDs without changing the original source records.
 * Duplicate display labels receive a stable source-order suffix as a defensive
 * fallback. Current equipment normalization avoids known Magazine/Pouch identity
 * collisions by using distinct canonical names or instance-level customAppend text.
 */
export function withCatalogIds<T extends object>(
  items: T[],
  namespace: string,
  getLabel: (item: T) => string,
): Array<T & { catalogId: string }> {
  const bases = items.map((item) => makeCatalogId(namespace, getLabel(item)));
  const totals = new Map<string, number>();
  for (const base of bases) totals.set(base, (totals.get(base) ?? 0) + 1);

  const seen = new Map<string, number>();
  return items.map((item, index) => {
    const base = bases[index];
    const ordinal = (seen.get(base) ?? 0) + 1;
    seen.set(base, ordinal);
    const catalogId = (totals.get(base) ?? 0) > 1 ? `${base}-${ordinal}` : base;
    return { ...item, catalogId };
  });
}

export type MagicItemCompletenessShape = {
  name: string;
  form: string;
  gradeAvailability: string;
  description: string;
};

/**
 * Current chargen intentionally exposes only magic items with a complete playable
 * record. Placeholder catalogue entries stay in magicItems.json as source material
 * but are not offered to the player yet.
 */
export function isCompleteMagicItem(item: MagicItemCompletenessShape): boolean {
  const placeholder = 'no detailed effect entry is currently specified';
  return Boolean(
    item.name?.trim() &&
    item.form?.trim() &&
    item.gradeAvailability?.trim() &&
    item.description?.trim() &&
    !item.description.toLowerCase().includes(placeholder),
  );
}
