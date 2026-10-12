import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import nestClient from '../../api/nest-client';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  const { data: licenseStatus } = useQuery({
    queryKey: ['license-status'],
    queryFn: async () => { const r = await nestClient.get('/license/status'); return r.data; },
    refetchInterval: 3600000, // refresh every hour
  });

  // A missing licence is not a healthy licence. With nothing active the API
  // answers { valid: false } and omits daysRemaining, and the previous
  // `?? 999` fallback read that as "999 days left" — so a revoked or
  // never-licensed install showed no banner at all and looked licensed.
  const licensed = licenseStatus?.valid === true;
  const daysRemaining = licensed ? (licenseStatus?.daysRemaining ?? 0) : 0;
  const isExpiringSoon = licensed && daysRemaining > 0 && daysRemaining <= 7;
  // Only complain once the status is actually known, so a slow or failed request
  // cannot flash a red banner on every page load.
  const isExpired = licenseStatus !== undefined && !licensed;

  return (
    <div className="d-flex vh-100">
      <Sidebar />
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        <TopBar />

        {/* License Expiration Warning Banner */}
        {(isExpiringSoon || isExpired) && (
          <div style={{
            background: isExpired
              ? 'linear-gradient(90deg, #dc3545, #a71d2a)'
              : 'linear-gradient(90deg, #fd7e14, #e05d00)',
            color: 'white',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}>
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${isExpired ? 'bi-exclamation-triangle-fill' : 'bi-clock-fill'} fs-5`}></i>
              <span>
                {isExpired
                  ? 'Your license is not active. Activate a license to restore full access.'
                  : `Your free trial period will be expiring in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Please activate a license to continue using OpenRx without interruption.`
                }
              </span>
            </div>
            <NavLink to="/license" className="btn btn-light btn-sm fw-semibold" style={{ whiteSpace: 'nowrap' }}>
              <i className="bi bi-key me-1"></i>
              Activate License
            </NavLink>
          </div>
        )}

        <main className="flex-grow-1 overflow-auto p-3 bg-light">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
