import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMyAvatar } from '../../hooks/useMyAvatar';
import { useLicenseStatus } from '../../hooks/useLicenseStatus';
import { useRoleAccess } from '../../hooks/useRoleAccess';

export default function TopBar() {
  const { user, logout } = useAuth();
  const { data: myAvatar } = useMyAvatar();
  const { data: licenseStatus } = useLicenseStatus();
  // Same server-side rule the sidebar uses (registrar ⇄ billing sharing).
  const { hasAnyRole } = useRoleAccess();
  // Same cache entry the layout banner reads, so the two cannot disagree.
  const unlicensed = licenseStatus !== undefined && licenseStatus.valid !== true;
  const myAvatarUrl = myAvatar?.url || undefined;
  // /provider/profile/:id only accepts these roles, so only they get a link.
  const canOpenProfile =
    !!myAvatar?.userId && !!user?.role && hasAnyRole(['admin', 'physician', 'front_desk']);

  const avatar = myAvatarUrl ? (
    <img
      src={myAvatarUrl}
      alt=""
      className="rounded-circle flex-shrink-0"
      style={{ width: '1.75rem', height: '1.75rem', objectFit: 'cover' }}
    />
  ) : (
    <i className="bi bi-person-circle" style={{ fontSize: '1.4rem', color: '#6c757d' }}></i>
  );

  return (
    <header className="bg-white border-bottom px-3 py-2 d-flex justify-content-between align-items-center">
      <div>
        {/* Breadcrumb or page title — filled by child routes via Outlet context */}
        {unlicensed && (
          <NavLink
            to="/license"
            className="badge text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ background: '#dc3545', color: 'white', fontSize: '0.72rem', padding: '0.4rem 0.7rem', fontWeight: 600 }}
            title="This installation has no active licence — click to activate a key"
          >
            <i className="bi bi-exclamation-triangle-fill"></i>
            Unlicensed
          </NavLink>
        )}
      </div>
      <div className="d-flex align-items-center gap-3">
        {user && (
          canOpenProfile ? (
            <NavLink
              to={`/providers/${myAvatar!.userId}`}
              className="d-flex align-items-center gap-2 text-decoration-none"
              title={myAvatarUrl ? 'My profile & photo' : 'Add your photo'}
            >
              {avatar}
              <span className="text-muted small">{user.displayName}</span>
            </NavLink>
          ) : (
            <span className="text-muted small d-flex align-items-center gap-2">
              {avatar}
              {user.displayName}
            </span>
          )
        )}
        <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
          <i className="bi bi-box-arrow-right me-1"></i>
          Logout
        </button>
      </div>
    </header>
  );
}
