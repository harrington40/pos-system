import { NavLink } from 'react-router-dom';

/**
 * Shown instead of the application when there is no active licence.
 *
 * Deliberately minimal: no navigation, no pages, one way forward. The licence
 * page is a route of its own outside the shell, so activating a key is always
 * reachable from here. Nothing is rendered until the licence status is actually
 * known, so a slow or failed status request cannot lock an operator out.
 */
export default function LicenseRequired() {
    return (
        <div className="d-flex align-items-center justify-content-center h-100">
            <div
                className="card border-0 shadow-sm text-center"
                style={{ maxWidth: '540px', borderRadius: '16px' }}
            >
                <div className="card-body p-4 p-md-5">
                    <i
                        className="bi bi-shield-lock-fill"
                        style={{ fontSize: '2.75rem', color: '#dc3545' }}
                    ></i>
                    <h4 className="mt-3 fw-bold">License required</h4>
                    <p className="text-muted mb-4">
                        This installation has no active license, so its pages are
                        unavailable. Activate a license key to restore access.
                    </p>
                    <NavLink
                        to="/license"
                        className="btn btn-primary fw-semibold px-4"
                    >
                        <i className="bi bi-key me-1"></i>
                        Activate License
                    </NavLink>
                </div>
            </div>
        </div>
    );
}
