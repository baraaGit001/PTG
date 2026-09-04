import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import GuestHomePage from './guest-home-page';

/** Authenticated visitors land on the partner dashboard; everyone else sees the guest marketplace landing. */
export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/app" replace />;
  return <GuestHomePage />;
}
