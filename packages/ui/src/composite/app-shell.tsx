import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
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

// --- shared nav body ----------------------------------------------------------

interface SidebarNavProps {
  primaryItems: NavItem[];
  sections: NavSection[];
  currentPath: string;
  linkComponent: NavLinkComponent;
  labels: Record<string, string>;
  /** Called after any nav link is followed - the mobile drawer uses it to close itself. */
  onNavigate?: () => void;
}

function SidebarNav({ primaryItems, sections, currentPath, linkComponent: Link, labels, onNavigate }: SidebarNavProps) {
  return (
    <>
      <SidebarGroup items={primaryItems} currentPath={currentPath} linkComponent={Link} labels={labels} onNavigate={onNavigate} />
      {sections.map((section) => (
        <div key={section.titleKey ?? section.items[0]?.path} className="mt-3 flex flex-col gap-1">
          {section.titleKey ? (
            <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              {labels[section.titleKey] ?? section.titleKey}
            </p>
          ) : null}
          <SidebarGroup items={section.items} currentPath={currentPath} linkComponent={Link} labels={labels} onNavigate={onNavigate} />
        </div>
      ))}
    </>
  );
}

interface SidebarGroupProps {
  items: NavItem[];
  currentPath: string;
  linkComponent: NavLinkComponent;
  labels: Record<string, string>;
  onNavigate?: () => void;
}

function SidebarGroup({ items, currentPath, linkComponent: Link, labels, onNavigate }: SidebarGroupProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = resolveIcon(item.icon);
        const active = isActive(item, currentPath);
        return (
          <Link
            key={item.path}
            href={item.path}
            onClick={onNavigate}
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
      <SidebarNav primaryItems={primaryItems} sections={sections} currentPath={currentPath} linkComponent={Link} labels={labels} />
      {footer ? <div className="mt-auto pt-3">{footer}</div> : null}
    </aside>
  );
}

// --- mobile sidebar (off-canvas drawer) ---------------------------------------

export interface MobileSidebarProps extends SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title for the drawer - screen readers announce it on open. */
  title?: string;
}

/**
 * The phone-sized counterpart to `Sidebar`: the same nav tree slid in from the
 * side, so secondary sections stay reachable instead of being cut down to the
 * handful of items a bottom bar could fit. Closes itself on navigation.
 */
export function MobileSidebar({
  open,
  onOpenChange,
  primaryItems,
  sections = [],
  currentPath,
  linkComponent: Link,
  labels,
  brand,
  footer,
  title = 'Menu',
  className,
}: MobileSidebarProps) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 start-0 z-50 flex h-full w-[17rem] max-w-[85vw] flex-col gap-1 overflow-y-auto border-e border-border bg-card p-3 shadow-raised',
            'data-[state=open]:animate-in data-[state=closed]:animate-out lg:hidden',
            'ltr:data-[state=closed]:slide-out-to-left ltr:data-[state=open]:slide-in-from-left',
            'rtl:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-right',
            className,
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-1 py-1">
            <DialogPrimitive.Title className="min-w-0 flex-1">
              {brand ?? <span className="text-sm font-semibold text-foreground">{title}</span>}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close menu"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Icons.X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <SidebarNav
            primaryItems={primaryItems}
            sections={sections}
            currentPath={currentPath}
            linkComponent={Link}
            labels={labels}
            onNavigate={close}
          />
          {footer ? <div className="mt-auto pt-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Hamburger that opens the mobile sidebar. Hidden once the desktop sidebar is visible. */
export interface MobileNavTriggerProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function MobileNavTrigger({ onClick, label = 'Open menu', className }: MobileNavTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden',
        className,
      )}
    >
      <Icons.Menu className="size-5" />
    </button>
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
  /** Off-canvas nav for phones - render `MobileSidebar` here; it portals itself. */
  mobileSidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Responsive shell: pinned sidebar + header on desktop, header + drawer sidebar on mobile. */
export function AppShell({ sidebar, header, mobileSidebar, children, className }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-surface">
      {sidebar}
      {mobileSidebar}
      <div className={cn('flex min-w-0 flex-1 flex-col', className)}>
        {header}
        <main className="flex-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</main>
      </div>
    </div>
  );
}
