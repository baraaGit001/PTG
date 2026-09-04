import type { User, PartnerProfile } from '@prisma/client';
import type { AuthenticatedUser } from '@ptg/types';
import type { PermissionName, RoleName } from '@ptg/types';

export interface AuthenticatedUserSource {
  user: User;
  partnerProfile: PartnerProfile | null;
  sponsorMemberId: string | null;
  roles: RoleName[];
  permissions: PermissionName[];
}

/** The single place that assembles the `/me` and login response shape. */
export function toAuthenticatedUser(source: AuthenticatedUserSource): AuthenticatedUser {
  const { user, partnerProfile, sponsorMemberId, roles, permissions } = source;
  return {
    id: user.id,
    memberId: user.memberId,
    fullName: user.fullName,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    locale: user.locale as AuthenticatedUser['locale'],
    status: user.status,
    roles,
    permissions,
    membership: partnerProfile
      ? {
          status: partnerProfile.membershipStatus,
          rank: partnerProfile.rank,
          level: partnerProfile.level,
          joinedAt: partnerProfile.joinedAt?.toISOString() ?? null,
          sponsorMemberId,
        }
      : null,
    createdAt: user.createdAt.toISOString(),
  };
}
