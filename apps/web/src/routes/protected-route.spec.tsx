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
        <Route path="/app" element={<div>Dashboard fallback</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute permissions={permissions}>
              <div>Secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const baseUser: AuthenticatedUser = {
  id: 'u1',
  memberId: 'PTG-100001',
  fullName: 'Test User',
  displayName: 'Test',
  email: null,
  phone: null,
  avatarUrl: null,
  locale: 'en',
  status: 'ACTIVE',
  roles: ['PARTNER'],
  permissions: ['wallet.read'],
  membership: null,
  createdAt: new Date().toISOString(),
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, bootstrapped: true, refreshing: null });
  });

  it('shows a spinner before the session bootstrap has finished', () => {
    useAuthStore.setState({ bootstrapped: false });
    renderAt('/protected');
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor to /login', () => {
    renderAt('/protected');
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('renders the protected content once a session exists', () => {
    useAuthStore.setState({ user: baseUser });
    renderAt('/protected');
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('redirects to /app when the user lacks a required permission', () => {
    useAuthStore.setState({ user: baseUser });
    renderAt('/protected', ['members.manage']);
    expect(screen.getByText('Dashboard fallback')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('allows access when the user holds every required permission', () => {
    useAuthStore.setState({ user: baseUser });
    renderAt('/protected', ['wallet.read']);
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });
});
