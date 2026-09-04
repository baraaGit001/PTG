import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthenticatedUser } from '@ptg/types';

function renderAt(initialPath: string, permissions?: Parameters<typeof ProtectedRoute>[0]['permissions']) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Admin dashboard fallback</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute permissions={permissions}>
              <div>Secret admin content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  memberId: 'PTG-ADMIN',
  fullName: 'Admin User',
  displayName: 'Admin',
  email: null,
  phone: null,
  avatarUrl: null,
  locale: 'en',
  status: 'ACTIVE',
  roles: ['SUPER_ADMIN'],
  permissions: ['users.read', 'settings.read'],
  membership: null,
  createdAt: new Date().toISOString(),
};

describe('admin ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, bootstrapped: true, refreshing: null });
  });

  it('redirects to /login when no admin session exists', () => {
    renderAt('/protected');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders admin content once a session with the right permission exists', () => {
    useAuthStore.setState({ user: adminUser });
    renderAt('/protected', ['users.read']);
    expect(screen.getByText('Secret admin content')).toBeInTheDocument();
  });

  it('redirects to the dashboard when the admin lacks the required permission', () => {
    useAuthStore.setState({ user: adminUser });
    renderAt('/protected', ['bonus.manage']);
    expect(screen.getByText('Admin dashboard fallback')).toBeInTheDocument();
  });
});
