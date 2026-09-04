import type { MembershipStatus, TreeKind, UserStatus } from '../enums.js';
import type { Locale } from '../locales.js';
import type { RoleName } from '../rbac.js';
import type { ListQuery } from '../envelope.js';

export interface AddressDto {
  id: string;
  recipientName: string;
  phone: string;
  country: string;
  region: string;
  city: string;
  district: string | null;
  street: string;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AddressInput = Omit<AddressDto, 'id' | 'createdAt' | 'updatedAt'>;

export interface ProfileDto {
  id: string;
  memberId: string;
  fullName: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  locale: Locale;
  status: UserStatus;
  roles: RoleName[];
  createdAt: string;
  partner: PartnerProfileDto | null;
}

export interface PartnerProfileDto {
  membershipStatus: MembershipStatus;
  rank: string | null;
  level: number;
  joinedAt: string | null;
  businessName: string | null;
  taxId: string | null;
  sponsor: MemberSummaryDto | null;
  placementParent: MemberSummaryDto | null;
  directMemberCount: number;
  totalDownlineCount: number;
}

export interface UpdateProfileRequest {
  fullName?: string;
  displayName?: string;
  phone?: string;
  locale?: Locale;
  avatarUrl?: string | null;
}

export interface MemberSummaryDto {
  id: string;
  memberId: string;
  fullName: string;
  displayName: string;
  avatarUrl: string | null;
  membershipStatus: MembershipStatus;
  rank: string | null;
  level: number;
  joinedAt: string | null;
  /** Depth relative to the requesting member's root in the queried tree. */
  depth: number;
  directChildCount: number;
}

export interface MemberDetailDto extends MemberSummaryDto {
  email: string | null;
  phone: string | null;
  country: string | null;
  sponsor: MemberSummaryDto | null;
  placementParent: MemberSummaryDto | null;
  stats: MemberStatsDto;
}

export interface MemberStatsDto {
  directMemberCount: number;
  totalDownlineCount: number;
  orderCount: number;
  /** Personal points balance (integer, no minor units - points are whole). */
  personalPoints: number;
}

export interface MemberListQuery extends ListQuery {
  status?: MembershipStatus;
  /** Restricts to members directly sponsored/placed under this member. */
  parentMemberId?: string;
  tree?: TreeKind;
}

export interface TreeNodeDto {
  member: MemberSummaryDto;
  /** Populated only up to the requested depth; deeper levels are lazy-loaded. */
  children: TreeNodeDto[];
  /** True when `children` was truncated by the depth limit. */
  hasMoreChildren: boolean;
}

export interface TreeQuery {
  /** Defaults to the authenticated member. Admins may pass any member id. */
  rootMemberId?: string;
  /** How many generations to materialise in one response. */
  depth?: number;
  search?: string;
  status?: MembershipStatus;
}

export interface TreeResponse {
  kind: TreeKind;
  root: TreeNodeDto;
  maxDepth: number;
  totalNodes: number;
}

export interface MemberReportSummaryDto {
  joinedAt: string | null;
  membershipStatus: MembershipStatus;
  rank: string | null;
  level: number;
  directMemberCount: number;
  totalDownlineCount: number;
  newMembersInPeriod: number;
  fulfillmentOrderCount: number;
  sponsorTreeDepth: number;
  placementTreeDepth: number;
}
