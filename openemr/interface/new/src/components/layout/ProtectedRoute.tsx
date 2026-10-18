import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = localStorage.getItem('openemr_user');
  const location = useLocation();

  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
}
