import 'server-only';
import type { openDatabase } from '../db/connection';
import type { AuthorizationPrincipal, AccountState, CampaignRole, MembershipState } from './access-policy';

/**
 * Resolve fresh authorization state using only an ID obtained from Better Auth's
 * validated server session. Call for every request; never cache permissions in cookies.
 */
export function resolveAuthorizationPrincipal(
  connection: ReturnType<typeof openDatabase>,
  authenticatedUserId: string,
): AuthorizationPrincipal | null {
  if (!authenticatedUserId) return null;
  const user = connection.sqlite.prepare(`
    SELECT u.id AS userId, u.email_verified AS emailVerified,
           COALESCE(a.status, 'active') AS accountState,
           EXISTS (SELECT 1 FROM site_administrators s WHERE s.user_id = u.id) AS siteAdministrator
    FROM user u LEFT JOIN account_access a ON a.user_id = u.id
    WHERE u.id = ?
  `).get(authenticatedUserId) as {
    userId: string; emailVerified: number; accountState: AccountState; siteAdministrator: number;
  } | undefined;
  if (!user) return null;
  const memberships = connection.sqlite.prepare(`
    SELECT campaign_id AS campaignId, role, state, invited_by_user_id AS invitedByUserId
    FROM campaign_memberships WHERE user_id = ? ORDER BY campaign_id
  `).all(user.userId) as Array<{
    campaignId: string; role: CampaignRole; state: MembershipState; invitedByUserId: string | null;
  }>;
  return {
    userId: user.userId,
    emailVerified: user.emailVerified === 1,
    accountState: user.accountState,
    siteAdministrator: user.siteAdministrator === 1,
    memberships,
  };
}
