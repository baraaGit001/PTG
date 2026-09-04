import * as React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, LogOut, User as UserIcon } from 'lucide-react';
import {
  AppShell,
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  LanguageSelector,
  MobileBottomNav,
  Sidebar,
  TopHeader,
} from '@ptg/ui';
import { GUEST_PRIMARY_NAV, ME_NAV, PRIMARY_NAV, filterNavByPermissions, filterNavSections } from '@ptg/config';
import type { Locale } from '@ptg/types';
import { RouterNavLink } from '@/components/router-nav-link';
import { useNavLabels } from '@/hooks/use-nav-labels';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/features/auth/api';
import { useNotificationCounts } from '@/features/notifications/api';
import { applyLocale } from '@/i18n';
import { usePublicSettings } from '@/features/settings/api';

export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const labels = useNavLabels();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: settings } = usePublicSettings();
  const { data: counts } = useNotificationCounts(Boolean(user));

  const primaryItems = filterNavByPermissions(user ? PRIMARY_NAV : GUEST_PRIMARY_NAV, user?.permissions ?? [], Boolean(user));
  const meSections = user ? filterNavSections(ME_NAV, user.permissions, true) : [];

  const brand = (
    <div className="flex items-center gap-2 px-1">
      <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        {(settings?.brandName ?? 'PTG').slice(0, 1)}
      </div>
      <span className="text-sm font-semibold text-foreground">{settings?.brandName ?? t('common.appName')}</span>
    </div>
  );

  return (
    <AppShell
      sidebar={
        <Sidebar
          primaryItems={primaryItems}
          sections={meSections}
          currentPath={location.pathname}
          linkComponent={RouterNavLink}
          labels={labels}
          brand={brand}
        />
      }
      header={
        <TopHeader
          left={<div className="lg:hidden">{brand}</div>}
          right={
            <>
              {settings?.demoMode ? (
                <span className="hidden rounded-full bg-warning/10 px-2 py-0.5 text-2xs font-medium text-warning sm:inline">Demo</span>
              ) : null}
              <LanguageSelector
                value={(user?.locale ?? 'en') as Locale}
                onChange={(locale) => applyLocale(locale)}
              />
              {user ? (
                <Button variant="ghost" size="icon" onClick={() => navigate('/app')} aria-label="Notifications" className="relative">
                  <Bell className="size-4" />
                  {counts && counts.unread > 0 ? (
                    <span className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] text-destructive-foreground">
                      {counts.unread > 9 ? '9+' : counts.unread}
                    </span>
                  ) : null}
                </Button>
              ) : null}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="flex items-center gap-2 rounded-full">
                      <Avatar>
                        <AvatarFallback>{user.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => navigate('/app/profile')}>
                      <UserIcon className="size-4" />
                      {t('nav.personalInformation')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => logout.mutate(false)}>
                      <LogOut className="size-4" />
                      {t('common.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button size="sm" onClick={() => navigate('/login')}>
                  {t('common.signIn')}
                </Button>
              )}
            </>
          }
        />
      }
      bottomNav={<MobileBottomNav items={primaryItems} currentPath={location.pathname} linkComponent={RouterNavLink} labels={labels} />}
    >
      <div className="mx-auto max-w-6xl px-4 py-4 lg:px-6 lg:py-6">
        <Outlet />
      </div>
    </AppShell>
  );
}
