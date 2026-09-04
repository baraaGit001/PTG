import type { PermissionName } from '@ptg/types';

/**
 * Single source of truth for the application's information architecture.
 *
 * The mobile bottom bar and the desktop sidebar render from the same
 * definitions, so the two never drift apart - the brief requires one responsive
 * layout, not duplicated mobile and desktop pages.
 */
export interface NavItem {
  /** i18n key under the `nav` namespace. */
  labelKey: string;
  path: string;
  /** Lucide icon name resolved by the frontend icon registry. */
  icon: string;
  /** When true the item is only rendered for authenticated users. */
  requiresAuth?: boolean;
  /** All listed permissions must be held. Backend still enforces them. */
  permissions?: PermissionName[];
  /** Matches child routes for active-state highlighting. */
  matchPrefix?: string;
}

export interface NavSection {
  titleKey?: string;
  items: NavItem[];
}

/** The five primary destinations: mobile bottom nav and desktop sidebar top. */
export const PRIMARY_NAV: NavItem[] = [
  { labelKey: 'nav.home', path: '/app', icon: 'Home', requiresAuth: true, matchPrefix: '/app' },
  { labelKey: 'nav.goods', path: '/shop', icon: 'Store', matchPrefix: '/shop' },
  { labelKey: 'nav.health', path: '/health', icon: 'HeartPulse', matchPrefix: '/health' },
  { labelKey: 'nav.cart', path: '/cart', icon: 'ShoppingCart', matchPrefix: '/cart' },
  { labelKey: 'nav.me', path: '/app/profile', icon: 'User', requiresAuth: true },
];

/** Guest-facing primary nav, used before sign-in. */
export const GUEST_PRIMARY_NAV: NavItem[] = [
  { labelKey: 'nav.home', path: '/', icon: 'Home' },
  { labelKey: 'nav.goods', path: '/catalog', icon: 'Store', matchPrefix: '/catalog' },
  { labelKey: 'nav.health', path: '/health/knowledge', icon: 'HeartPulse' },
  { labelKey: 'nav.cart', path: '/cart', icon: 'ShoppingCart' },
  { labelKey: 'nav.signIn', path: '/login', icon: 'LogIn' },
];

/** The "Me" area - exposed as a menu on mobile and a sidebar group on desktop. */
export const ME_NAV: NavSection[] = [
  {
    titleKey: 'nav.groups.business',
    items: [
      { labelKey: 'nav.myReport', path: '/app/report', icon: 'FileBarChart', requiresAuth: true },
      {
        labelKey: 'nav.members',
        path: '/app/members',
        icon: 'Users',
        requiresAuth: true,
        permissions: ['members.read'],
      },
      {
        labelKey: 'nav.fulfillmentOrders',
        path: '/app/fulfillment-orders',
        icon: 'PackageCheck',
        requiresAuth: true,
        permissions: ['fulfillment.read'],
      },
      {
        labelKey: 'nav.sponsorTree',
        path: '/app/sponsor-tree',
        icon: 'Network',
        requiresAuth: true,
        permissions: ['members.tree.read'],
      },
      {
        labelKey: 'nav.placementTree',
        path: '/app/placement-tree',
        icon: 'GitBranch',
        requiresAuth: true,
        permissions: ['members.tree.read'],
      },
      {
        labelKey: 'nav.myBonus',
        path: '/app/bonuses',
        icon: 'Gift',
        requiresAuth: true,
        permissions: ['bonus.read'],
      },
    ],
  },
  {
    titleKey: 'nav.groups.commerce',
    items: [
      { labelKey: 'nav.myOrders', path: '/orders', icon: 'Receipt', requiresAuth: true },
      {
        labelKey: 'nav.myWallet',
        path: '/app/wallet',
        icon: 'Wallet',
        requiresAuth: true,
        permissions: ['wallet.read'],
      },
    ],
  },
  {
    titleKey: 'nav.groups.account',
    items: [
      { labelKey: 'nav.personalInformation', path: '/app/profile', icon: 'IdCard', requiresAuth: true },
      { labelKey: 'nav.addresses', path: '/app/addresses', icon: 'MapPin', requiresAuth: true },
      { labelKey: 'nav.language', path: '/app/language', icon: 'Languages', requiresAuth: true },
    ],
  },
];

/** Health hub tiles, mirrored by the quick actions on the home dashboard. */
export const HEALTH_NAV: NavItem[] = [
  { labelKey: 'nav.healthManagement', path: '/health/management', icon: 'Activity', requiresAuth: true },
  { labelKey: 'nav.community', path: '/health/community', icon: 'MessagesSquare' },
  { labelKey: 'nav.sportRanking', path: '/health/sport-ranking', icon: 'Trophy' },
  { labelKey: 'nav.healthKnowledge', path: '/health/knowledge', icon: 'BookOpen' },
];

/** Admin application sidebar. Every entry is additionally guarded server-side. */
export const ADMIN_NAV: NavSection[] = [
  {
    titleKey: 'nav.groups.overview',
    items: [{ labelKey: 'nav.admin.dashboard', path: '/', icon: 'LayoutDashboard' }],
  },
  {
    titleKey: 'nav.groups.people',
    items: [
      { labelKey: 'nav.admin.users', path: '/users', icon: 'Users', permissions: ['users.read'] },
      { labelKey: 'nav.admin.partners', path: '/partners', icon: 'Handshake', permissions: ['members.read'] },
    ],
  },
  {
    titleKey: 'nav.groups.commerce',
    items: [
      { labelKey: 'nav.admin.products', path: '/products', icon: 'Package', permissions: ['products.read'] },
      { labelKey: 'nav.admin.categories', path: '/categories', icon: 'FolderTree', permissions: ['products.read'] },
      { labelKey: 'nav.admin.orders', path: '/orders', icon: 'Receipt', permissions: ['orders.read.any'] },
      {
        labelKey: 'nav.admin.fulfillment',
        path: '/fulfillment',
        icon: 'Truck',
        permissions: ['fulfillment.read'],
      },
    ],
  },
  {
    titleKey: 'nav.groups.finance',
    items: [
      { labelKey: 'nav.admin.wallets', path: '/wallets', icon: 'Wallet', permissions: ['wallet.read.any'] },
      { labelKey: 'nav.admin.bonuses', path: '/bonuses', icon: 'Gift', permissions: ['bonus.read.any'] },
      { labelKey: 'nav.admin.points', path: '/points', icon: 'Coins', permissions: ['points.read.any'] },
      {
        labelKey: 'nav.admin.investmentPlans',
        path: '/investment-plans',
        icon: 'LineChart',
        permissions: ['investment.read'],
      },
    ],
  },
  {
    titleKey: 'nav.groups.content',
    items: [
      {
        labelKey: 'nav.admin.promotions',
        path: '/promotions',
        icon: 'Megaphone',
        permissions: ['promotions.read'],
      },
      {
        labelKey: 'nav.admin.community',
        path: '/community',
        icon: 'MessagesSquare',
        permissions: ['community.moderate'],
      },
      { labelKey: 'nav.admin.health', path: '/health', icon: 'HeartPulse', permissions: ['content.read'] },
    ],
  },
  {
    titleKey: 'nav.groups.platform',
    items: [
      {
        labelKey: 'nav.admin.localization',
        path: '/localization',
        icon: 'Languages',
        permissions: ['localization.manage'],
      },
      { labelKey: 'nav.admin.auditLogs', path: '/audit-logs', icon: 'ScrollText', permissions: ['audit.read'] },
      { labelKey: 'nav.admin.settings', path: '/settings', icon: 'Settings', permissions: ['settings.read'] },
    ],
  },
];

export function filterNavByPermissions(
  items: NavItem[],
  granted: readonly PermissionName[],
  isAuthenticated: boolean,
): NavItem[] {
  return items.filter((item) => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (!item.permissions?.length) return true;
    return item.permissions.every((permission) => granted.includes(permission));
  });
}

export function filterNavSections(
  sections: NavSection[],
  granted: readonly PermissionName[],
  isAuthenticated: boolean,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: filterNavByPermissions(section.items, granted, isAuthenticated),
    }))
    .filter((section) => section.items.length > 0);
}
