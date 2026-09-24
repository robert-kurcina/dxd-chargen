/** Local selection rules, not an authorization boundary. Details remain readable. */
export type OriginPolicy = { settlementTags: Record<string, readonly string[]> };
export const unrestrictedOrigins: OriginPolicy = { settlementTags: {} };
export function originAllowed(policy: OriginPolicy, settlementId: string | null | undefined) {
  return !settlementId || !(policy.settlementTags[settlementId] ?? []).some(tag => tag.trim().toLowerCase() === 'disallow');
}
export function originEligibility(policy: OriginPolicy) {
  return (kind: string, id: string) => kind !== 'settlement' || originAllowed(policy, id);
}
export function libraryTagMatches(tags: readonly string[] | undefined, filter: string) {
  const normalized = filter.trim().toLocaleLowerCase();
  return !normalized || (tags ?? []).some(tag => tag.trim().toLocaleLowerCase() === normalized);
}
/** Prospective restriction: existing origins are retained, not silently rewritten. */
export function originChangeAllowed(policy: OriginPolicy, beforeId: string | null, afterId: string | null) {
  return beforeId === afterId || originAllowed(policy, afterId);
}
