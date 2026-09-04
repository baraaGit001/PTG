import { Outlet, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import {
  AppShell,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sidebar,
  TopHeader,
} from '@ptg/ui';
import { ADMIN_NAV, filterNavSections } from '@ptg/config';
import { RouterNavLink } from '@/components/router-nav-link';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/features/auth/api';

const ADMIN_LABELS: Record<string, string> = {
  'nav.groups.overview': 'Overview',
  'nav.groups.people': 'People',
  'nav.groups.commerce': 'Commerce',
  'nav.groups.finance': 'Finance',
  'nav.groups.content': 'Content',
  'nav.groups.platform': 'Platform',
  'nav.admin.dashboard': 'Dashboard',
  'nav.admin.users': 'Users',
  'nav.admin.partners': 'Partners',
  'nav.admin.products': 'Products',
  'nav.admin.categories': 'Categories',
  'nav.admin.orders': 'Orders',
  'nav.admin.fulfillment': 'Fulfillment',
  'nav.admin.wallets': 'Wallets',
  'nav.admin.bonuses': 'Bonuses',
  'nav.admin.points': 'Points',
  'nav.admin.investmentPlans': 'Investment Plans',
  'nav.admin.promotions': 'Promotions',
  'nav.admin.community': 'Community',
  'nav.admin.health': 'Health Content',
  'nav.admin.localization': 'Localization',
  'nav.admin.auditLogs': 'Audit Logs',
  'nav.admin.settings': 'Settings',
};

export function AdminLayout() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const sections = filterNavSections(ADMIN_NAV, user?.permissions ?? [], true);
  const currentPath = location.pathname === '/' ? '/' : location.pathname;

  const brand = (
    <div className="flex items-center gap-2 px-1">
      <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">P</div>
      <span className="text-sm font-semibold text-foreground">PTG Admin</span>
    </div>
  );

  return (
    <AppShell
      sidebar={<Sidebar primaryItems={[]} sections={sections} currentPath={currentPath} linkComponent={RouterNavLink} labels={ADMIN_LABELS} brand={brand} />}
      header={
        <TopHeader
          left={<div className="lg:hidden">{brand}</div>}
          right={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>{user?.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => logout.mutate(false)}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-6">
        <Outlet />
      </div>
    </AppShell>
  );
}
