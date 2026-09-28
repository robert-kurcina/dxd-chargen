import 'server-only';

export type CampaignRole = 'player' | 'gm' | 'campaign-administrator';
export type MembershipState = 'active' | 'banned' | 'removed';
export type AccountState = 'active' | 'disabled' | 'banned';

/** Built from fresh server-side account, Site Administrator, and membership reads. */
export type AuthorizationPrincipal = {
  userId: string;
  emailVerified: boolean;
  accountState: AccountState;
  siteAdministrator: boolean;
  memberships: readonly {
    campaignId: string;
    role: CampaignRole;
    state: MembershipState;
    invitedByUserId: string | null;
  }[];
};

/** Values must come from stored character/campaign records, never the request body. */
export type AuthorizationResource = {
  campaignId?: string | null;
  campaignIsDefault?: boolean;
  characterOwnerId?: string;
  private?: boolean;
  /** Computed by the service from campaign state and approval/version records. */
  ownerEditAllowed?: boolean;
  targetRole?: CampaignRole;
  targetInvitedByActor?: boolean;
};

export type AuthorizationAction =
  | 'site.manage'
  | 'campaign.read'
  | 'campaign.configure'
  | 'campaign.rename'
  | 'campaign.manage-members'
  | 'campaign.ban-player'
  | 'campaign.ban-invited-gm'
  | 'character.create'
  | 'character.read'
  | 'character.edit';

function activeMembership(principal: AuthorizationPrincipal, campaignId: string) {
  const matches = principal.memberships.filter(membership => membership.campaignId === campaignId);
  // Duplicate membership rows indicate corrupt or ambiguous authorization state.
  return matches.length === 1 && matches[0].state === 'active' ? matches[0] : null;
}

function isCampaignStaff(role: CampaignRole | undefined) {
  return role === 'gm' || role === 'campaign-administrator';
}

/**
 * Evaluate an authorization decision from authoritative, server-resolved records.
 * This helper does not authenticate requests, load records, or replace transaction-time
 * policy checks in the eventual repository/service layer.
 */
export function isAuthorized(
  principal: AuthorizationPrincipal | null,
  action: AuthorizationAction,
  resource: AuthorizationResource = {},
): boolean {
  if (!principal || !principal.userId || !principal.emailVerified || principal.accountState !== 'active') return false;
  if (action === 'site.manage') return principal.siteAdministrator;
  if (principal.siteAdministrator) return true;

  const campaignId = resource.campaignId ?? null;
  const membership = campaignId ? activeMembership(principal, campaignId) : null;
  const role = membership?.role;

  switch (action) {
    case 'campaign.read':
      return Boolean(campaignId && (membership || resource.campaignIsDefault));
    case 'campaign.configure':
      return Boolean(campaignId && isCampaignStaff(role));
    case 'campaign.rename':
    case 'campaign.manage-members':
      return Boolean(campaignId && role === 'campaign-administrator');
    case 'campaign.ban-player':
      return Boolean(campaignId && isCampaignStaff(role) && resource.targetRole === 'player');
    case 'campaign.ban-invited-gm':
      return Boolean(campaignId && role === 'gm' && resource.targetRole === 'gm' && resource.targetInvitedByActor === true);
    case 'character.create':
      // A personal/unassigned character belongs to its authenticated creator. Campaign
      // creation requires an active campaign membership; campaign policies are checked later.
      return !campaignId || Boolean(membership || resource.campaignIsDefault);
    case 'character.read': {
      if (campaignId && !membership && !resource.campaignIsDefault) return false;
      const isOwner = resource.characterOwnerId === principal.userId;
      if (isOwner) return true;
      if (resource.private) return Boolean(campaignId && isCampaignStaff(role));
      // Non-private unassigned characters are visible in the shared Library.
      return true;
    }
    case 'character.edit': {
      if (campaignId && !membership && !resource.campaignIsDefault) return false;
      if (campaignId && isCampaignStaff(role)) return true;
      return resource.characterOwnerId === principal.userId && resource.ownerEditAllowed === true;
    }
  }
}
