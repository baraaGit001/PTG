import * as React from 'react';
import { Link } from 'react-router-dom';
import type { NavLinkComponent } from '@ptg/ui';

export const RouterNavLink: NavLinkComponent = ({ href, className, children, onClick }) => (
  <Link to={href} className={className} onClick={onClick}>
    {children}
  </Link>
);
