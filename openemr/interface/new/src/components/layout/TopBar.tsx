import { useAuth } from '../../hooks/useAuth';

export default function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-bottom px-3 py-2 d-flex justify-content-between align-items-center">
      <div>
        {/* Breadcrumb or page title — filled by child routes via Outlet context */}
      </div>
      <div className="d-flex align-items-center gap-3">
        {user && (
          <span className="text-muted small">
            <i className="bi bi-person me-1"></i>
            {user.displayName}
          </span>
        )}
        <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
          <i className="bi bi-box-arrow-right me-1"></i>
          Logout
        </button>
      </div>
    </header>
  );
}
