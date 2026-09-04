import type { Locale } from '../locales.js';
import type { PermissionName, RoleName } from '../rbac.js';
import type { MembershipStatus, UserStatus } from '../enums.js';

export interface LoginRequest {
  /** The public-facing member identifier printed on the member card. */
  memberId: string;
  password: string;
  /** Extends refresh-token lifetime and marks the session as long-lived. */
  rememberMe?: boolean;
  locale?: Locale;
}

export interface AuthTokens {
  accessToken: string;
  /** Seconds until `accessToken` expires. */
  expiresIn: number;
  tokenType: 'Bearer';
  /**
   * Only returned when the client is not using cookie transport. Web clients
   * receive the refresh token as an httpOnly, SameSite=Strict cookie instead.
   */
  refreshToken?: string;
}

export interface AuthenticatedUser {
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
  permissions: PermissionName[];
  membership: {
    status: MembershipStatus;
    rank: string | null;
    level: number;
    joinedAt: string | null;
    sponsorMemberId: string | null;
  } | null;
  createdAt: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  tokens: AuthTokens;
  sessionId: string;
}

export interface RefreshRequest {
  /** Optional: cookie transport supplies the token automatically. */
  refreshToken?: string;
}

export interface RefreshResponse {
  tokens: AuthTokens;
  sessionId: string;
}

export interface LogoutRequest {
  /** Revokes every active session for the user, not just the current one. */
  allSessions?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  memberId: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
}
