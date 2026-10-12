import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { useLicenseStatus } from '../../hooks/useLicenseStatus';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  const { data: licenseStatus } = useLicenseStatus();

  // A missing licence is not a healthy licence. With nothing active the API
  // answers { valid: false } and omits daysRemaining, and a `?? 999` default
  // here used to read that as "999 days left" — so a revoked or never-licensed
  // install showed no banner at all and looked licensed.
  const licensed = licenseStatus?.valid === true;
  const daysRemaining = licensed ? (licenseStatus?.daysRemaining ?? 0) : 0;
  const isExpiringSoon = licensed && daysRemaining > 0 && daysRemaining <= 7;
  // Only complain once the status is actually known, so a slow or failed status
  // request cannot flash a banner on every page load.
  const isExpired = licenseStatus !== undefined && !licensed;

  // Mark the browser tab as well: an unlicensed install then stays visible in
  // the tab strip even when the user is looking at another application.
  useEffect(() => {
    const previous = document.title;
    if (isExpired) document.title = 'Unlicensed — OpenRx';
    return () => {
      document.title = previous;
    };
  }, [isExpired]);

  return (
    <div className="d-flex vh-100">
      <Sidebar />
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        <TopBar />

        {/* License Expiration Warning Banner */}
        {(isExpiringSoon || isExpired) && (
          <>
          <div
            role="alert"
            style={{
              background: isExpired
                ? 'linear-gradient(90deg, #dc3545, #a71d2a)'
                : 'linear-gradient(90deg, #fd7e14, #e05d00)',
              color: 'white',
              padding: '14px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontWeight: 600,
              borderBottom: '3px solid rgba(0,0,0,0.28)',
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <i
                className={`bi ${isExpired ? 'bi-exclamation-triangle-fill' : 'bi-clock-fill'} fs-2`}
                style={isExpired ? { animation: 'openrxLicensePulse 1.6s ease-in-out infinite' } : undefined}
              ></i>
              <span className="d-flex flex-column lh-sm">
                <span className="fs-5">
                  {isExpired
                    ? 'No active license'
                    : `License expiring in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`}
                </span>
                <span style={{ fontWeight: 400, fontSize: '0.85rem', opacity: 0.92 }}>
                  {isExpired
                    ? 'This installation is running unlicensed. Activate a key to license it.'
                    : 'Activate a license to keep using OpenRx without interruption.'}
                </span>
              </span>
            </div>
            <NavLink
              to="/license"
              className="btn btn-light fw-bold"
              style={{ whiteSpace: 'nowrap', color: isExpired ? '#a71d2a' : '#b34700', padding: '0.45rem 1.1rem' }}
            >
              <i className="bi bi-key me-1"></i>
              Activate License
            </NavLink>
          </div>
          {isExpired && (
            <style>{'@keyframes openrxLicensePulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }'}</style>
          )}
          </>
        )}

        <main className="flex-grow-1 overflow-auto p-3 bg-light">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
