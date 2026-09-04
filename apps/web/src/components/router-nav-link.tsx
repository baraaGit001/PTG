import * as React from 'react';
import { Link } from 'react-router-dom';
import type { NavLinkComponent } from '@ptg/ui';

/** Adapts react-router's <Link> to the NavLinkComponent shape @ptg/ui's Sidebar/MobileSidebar expect. */
export const RouterNavLink: NavLinkComponent = ({ href, className, children, onClick }) => (
  <Link to={href} className={className} onClick={onClick}>
    {children}
  </Link>
);
