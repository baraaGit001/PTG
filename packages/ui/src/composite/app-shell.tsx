import * as React from 'react';
import * as Icons from 'lucide-react';
import type { NavItem, NavSection } from '@ptg/config';
import { cn } from '../lib/cn.js';

/** Lets the host app inject its router's Link (React Router, etc.) without coupling this package to it. */
export type NavLinkComponent = React.ComponentType<{
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}>;

function resolveIcon(name: string): Icons.LucideIcon {
  const icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name];
  return icon ?? Icons.Circle;
}

function isActive(item: NavItem, currentPath: string): boolean {
  const prefix = item.matchPrefix ?? item.path;
  if (prefix === '/') return currentPath === '/';
  return currentPath === prefix || currentPath.startsWith(`${prefix}/`);
}

// --- mobile bottom navigation ------------------------------------------------

export interface MobileBottomNavProps {
  items: NavItem[];
  currentPath: string;
  linkComponent: NavLinkComponent;
  labels: Record<string, string>;
  className?: string;
}

export function MobileBottomNav({ items, currentPath, linkComponent: Link, labels, className }: MobileBottomNavProps) {
  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex h-bottom-nav items-stretch border-t border-border bg-card pb-safe-bottom lg:hidden',
        className,
      )}
      aria-label="Primary"
    >
      {items.map((item) => {
        const Icon = resolveIcon(item.icon);
        const active = isActive(item, currentPath);
        return (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-2xs font-medium',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.25 : 2} />
            {labels[item.labelKey] ?? item.labelKey}
          </Link>
        );
      })}
    </nav>
  );
}

// --- desktop sidebar ----------------------------------------------------------

export interface SidebarProps {
  primaryItems: NavItem[];
  sections?: NavSection[];
  currentPath: string;
  linkComponent: NavLinkComponent;
  labels: Record<string, string>;
  brand?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({ primaryItems, sections = [], currentPath, linkComponent: Link, labels, brand, footer, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-card p-3 lg:flex',
        className,
      )}
    >
      {brand ? <div className="mb-2 px-2 py-2">{brand}</div> : null}
      <SidebarGroup items={primaryItems} currentPath={currentPath} linkComponent={Link} labels={labels} />
      {sections.map((section) => (
        <div key={section.titleKey ?? section.items[0]?.path} className="mt-3 flex flex-col gap-1">
          {section.titleKey ? (
            <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              {labels[section.titleKey] ?? section.titleKey}
            </p>
          ) : null}
          <SidebarGroup items={section.items} currentPath={currentPath} linkComponent={Link} labels={labels} />
        </div>
      ))}
      {footer ? <div className="mt-auto pt-3">{footer}</div> : null}
    </aside>
  );
}

interface SidebarGroupProps {
  items: NavItem[];
  currentPath: string;
  linkComponent: NavLinkComponent;
  labels: Record<string, string>;
}

function SidebarGroup({ items, currentPath, linkComponent: Link, labels }: SidebarGroupProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = resolveIcon(item.icon);
        const active = isActive(item, currentPath);
        return (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{labels[item.labelKey] ?? item.labelKey}</span>
          </Link>
        );
      })}
    </div>
  );
}

// --- top header ---------------------------------------------------------------

export interface TopHeaderProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function TopHeader({ left, center, right, className }: TopHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">{left}</div>
      {center ? <div className="hidden flex-1 justify-center sm:flex">{center}</div> : null}
      <div className="flex shrink-0 items-center gap-2">{right}</div>
    </header>
  );
}

// --- shell layout ---------------------------------------------------------------

export interface AppShellProps {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Responsive shell: sidebar + header on desktop, header + bottom nav on mobile. Never renders duplicate pages. */
export function AppShell({ sidebar, header, bottomNav, children, className }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-surface">
      {sidebar}
      <div className={cn('flex min-w-0 flex-1 flex-col', className)}>
        {header}
        <main className="flex-1 pb-[calc(theme(spacing.bottom-nav)+1rem)] lg:pb-6">{children}</main>
        {bottomNav}
      </div>
    </div>
  );
}
