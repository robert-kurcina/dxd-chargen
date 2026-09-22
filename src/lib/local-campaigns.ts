/** Local development fixtures; these do not confer account permissions. */
export const DEFAULT_CAMPAIGN_ID = '7841aa01-33f4-4a90-8d13-000000000001';
export const WORKING_CAMPAIGN_ID = '7841aa01-33f4-4a90-8d13-000000000002';
export const CAMPAIGN_SELECTION_KEY = 'dxd-selected-campaign-v1';
export const LOCAL_CAMPAIGNS = [
  { id: DEFAULT_CAMPAIGN_ID, name: 'Default Campaign', baseline: true, sourceId: null, description: 'Create and experiment freely. This baseline cannot enter active play.' },
  { id: WORKING_CAMPAIGN_ID, name: 'Working Campaign', baseline: false, sourceId: DEFAULT_CAMPAIGN_ID, description: 'Your initial campaign, starting from the default rules and choices.' },
] as const;
export function localCampaign(id: unknown) {
  return LOCAL_CAMPAIGNS.find(campaign => campaign.id === id) ?? LOCAL_CAMPAIGNS[0];
}
export function campaignMatches(campaignId: string | null | undefined, filter: string) {
  return filter === 'all' || (campaignId || DEFAULT_CAMPAIGN_ID) === filter;
}
