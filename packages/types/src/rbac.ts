/**
 * Roles and granular permissions.
 *
 * The backend is the sole authority: every protected handler declares the
 * permissions it requires and the guard resolves them from the *database* role
 * assignment of the authenticated user. Client-supplied role or permission
 * claims are never trusted for authorization decisions.
 */

export const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE_ADMIN',
  'ORDER_ADMIN',
  'PRODUCT_ADMIN',
  'CONTENT_ADMIN',
  'SUPPORT',
  'PARTNER',
  'CUSTOMER',
  'GUEST',
] as const;

export type RoleName = (typeof ROLES)[number];

export const PERMISSIONS = [
  // users & access
  'users.read',
  'users.manage',
  'users.impersonate',
  'roles.manage',

  // members / network
  'members.read',
  'members.manage',
  'members.tree.read',
  'members.tree.manage',

  // wallet & ledger
  'wallet.read',
  'wallet.read.any',
  'wallet.adjust',
  'wallet.adjust.approve',

  // points
  'points.read',
  'points.read.any',
  'points.adjust',

  // bonus
  'bonus.read',
  'bonus.read.any',
  'bonus.manage',

  // catalog
  'products.read',
  'products.write',
  'categories.write',
  'inventory.read',
  'inventory.write',

  // orders
  'orders.read',
  'orders.read.any',
  'orders.manage',
  'orders.refund',
  'fulfillment.read',
  'fulfillment.manage',

  // content
  'content.read',
  'content.write',
  'content.publish',
  'community.moderate',

  // health & sport
  'health.read.any',
  'sport.manage',

  // promotions & investment
  'promotions.read',
  'promotions.manage',
  'investment.read',
  'investment.manage',

  // platform
  'settings.read',
  'settings.manage',
  'localization.manage',
  'audit.read',
  'notifications.send',
] as const;

export type PermissionName = (typeof PERMISSIONS)[number];

const ADMIN_PERMISSIONS: PermissionName[] = [
  'users.read',
  'users.manage',
  'members.read',
  'members.manage',
  'members.tree.read',
  'members.tree.manage',
  'wallet.read',
  'wallet.read.any',
  'wallet.adjust',
  'points.read',
  'points.read.any',
  'points.adjust',
  'bonus.read',
  'bonus.read.any',
  'bonus.manage',
  'products.read',
  'products.write',
  'categories.write',
  'inventory.read',
  'inventory.write',
  'orders.read',
  'orders.read.any',
  'orders.manage',
  'orders.refund',
  'fulfillment.read',
  'fulfillment.manage',
  'content.read',
  'content.write',
  'content.publish',
  'community.moderate',
  'health.read.any',
  'sport.manage',
  'promotions.read',
  'promotions.manage',
  'investment.read',
  'investment.manage',
  'settings.read',
  'settings.manage',
  'localization.manage',
  'audit.read',
  'notifications.send',
];

/**
 * Default permission matrix. Seeded into `RolePermission` and editable at
 * runtime by SUPER_ADMIN, so the database - not this file - is authoritative
 * once the system is running.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  ADMIN: ADMIN_PERMISSIONS,
  FINANCE_ADMIN: [
    'users.read',
    'members.read',
    'wallet.read',
    'wallet.read.any',
    'wallet.adjust',
    'wallet.adjust.approve',
    'points.read',
    'points.read.any',
    'points.adjust',
    'bonus.read',
    'bonus.read.any',
    'bonus.manage',
    'orders.read',
    'orders.read.any',
    'orders.refund',
    'investment.read',
    'investment.manage',
    'audit.read',
    'settings.read',
  ],
  ORDER_ADMIN: [
    'users.read',
    'members.read',
    'orders.read',
    'orders.read.any',
    'orders.manage',
    'fulfillment.read',
    'fulfillment.manage',
    'inventory.read',
    'products.read',
    'settings.read',
  ],
  PRODUCT_ADMIN: [
    'products.read',
    'products.write',
    'categories.write',
    'inventory.read',
    'inventory.write',
    'promotions.read',
    'promotions.manage',
    'settings.read',
  ],
  CONTENT_ADMIN: [
    'content.read',
    'content.write',
    'content.publish',
    'community.moderate',
    'promotions.read',
    'promotions.manage',
    'localization.manage',
    'sport.manage',
    'settings.read',
  ],
  SUPPORT: [
    'users.read',
    'members.read',
    'members.tree.read',
    'orders.read',
    'orders.read.any',
    'wallet.read.any',
    'points.read.any',
    'bonus.read.any',
    'fulfillment.read',
    'content.read',
    'settings.read',
  ],
  PARTNER: [
    'members.read',
    'members.tree.read',
    'wallet.read',
    'points.read',
    'bonus.read',
    'orders.read',
    'fulfillment.read',
    'products.read',
    'content.read',
    'promotions.read',
    'investment.read',
  ],
  CUSTOMER: ['wallet.read', 'points.read', 'orders.read', 'products.read', 'content.read', 'promotions.read'],
  GUEST: ['products.read', 'content.read', 'promotions.read'],
};

/** Roles allowed to authenticate into the admin application. */
export const ADMIN_ROLES: RoleName[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE_ADMIN',
  'ORDER_ADMIN',
  'PRODUCT_ADMIN',
  'CONTENT_ADMIN',
  'SUPPORT',
];

export function isAdminRole(role: RoleName): boolean {
  return ADMIN_ROLES.includes(role);
}

export function hasPermission(
  granted: readonly PermissionName[],
  required: PermissionName,
): boolean {
  return granted.includes(required);
}

export function hasAllPermissions(
  granted: readonly PermissionName[],
  required: readonly PermissionName[],
): boolean {
  return required.every((permission) => granted.includes(permission));
}

export function hasAnyPermission(
  granted: readonly PermissionName[],
  required: readonly PermissionName[],
): boolean {
  return required.some((permission) => granted.includes(permission));
}
