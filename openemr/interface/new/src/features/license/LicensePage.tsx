import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import nestClient from '../../api/nest-client';

interface LicenseStatus {
  valid: boolean;
  tier?: string;
  expiresAt?: string;
  daysRemaining?: number;
  customerName?: string;
  maxUsers?: number;
}

const TIER_INFO: Record<string, { label: string; color: string; icon: string }> = {
  basic: { label: 'Basic', color: '#0d6efd', icon: 'bi-star' },
  professional: { label: 'Professional', color: '#6f42c1', icon: 'bi-gem' },
  enterprise: { label: 'Enterprise', color: '#fd7e14', icon: 'bi-building' },
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const PLANS = [
  {
    tier: 'basic', price: '49', users: 5,
    features: ['Core EHR System', 'Patient Management', 'Appointment Scheduling', 'Basic Billing', 'Email Support'],
    excluded: ['e-Prescribing', 'Lab Orders', 'Imaging / DICOM', 'FHIR API', 'Custom Reports', 'Priority Support'],
    recommended: false,
  },
  {
    tier: 'professional', price: '149', users: 25,
    features: ['Everything in Basic', 'e-Prescribing (eRx)', 'Lab Orders & Results', 'Imaging / DICOM Viewer', 'Secure Document Sharing', 'FHIR API Access', 'Advanced Reporting', 'Phone Support'],
    excluded: ['Custom Reports', 'Unlimited API Access', 'Priority Support'],
    recommended: true,
  },
  {
    tier: 'enterprise', price: '499', users: 100,
    features: ['Everything in Professional', 'Unlimited API Access', 'Custom Report Builder', 'Dedicated Account Manager', 'Priority 24/7 Support', 'SSO Integration', 'Custom Branding', 'On-Premise Option'],
    excluded: [],
    recommended: false,
  },
];

export default function LicensePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [key, setKey] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const { data: status } = useQuery<LicenseStatus>({
    queryKey: ['license-status'],
    queryFn: async () => { const r = await nestClient.get('/license/status'); return r.data; },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const r = await nestClient.post('/license/activate', { key, customerName });
      return r.data;
    },
    onSuccess: () => {
      setSuccess('License activated successfully!');
      setError('');
      setKey('');
      queryClient.invalidateQueries({ queryKey: ['license-status'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Activation failed. Please check your key.');
      setSuccess('');
    },
  });

  const tierInfo = status?.tier ? TIER_INFO[status.tier] : null;

  return (
    <div className="glass-page position-relative overflow-hidden" style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem', background: 'linear-gradient(135deg, #dbeafe 0%, #f5faff 45%, #d1fae5 100%)', borderRadius: '20px', minHeight: '100vh' }}>
      <div className="position-absolute rounded-circle" style={{ width: '340px', height: '340px', top: '-80px', right: '-60px', background: 'radial-gradient(circle, rgba(13,110,253,0.30), transparent 70%)', filter: 'blur(20px)', zIndex: 0 }}></div>
      <div className="position-absolute rounded-circle" style={{ width: '400px', height: '400px', bottom: '8%', left: '-120px', background: 'radial-gradient(circle, rgba(0,201,167,0.30), transparent 70%)', filter: 'blur(20px)', zIndex: 0 }}></div>
      <style>{`
        .glass-page .card {
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,0.60) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.9) !important;
          box-shadow: 0 22px 45px rgba(10,37,64,0.20), 0 6px 14px rgba(10,37,64,0.10) !important;
          transition: transform .25s ease, box-shadow .25s ease, background .25s ease;
        }
        .glass-page .card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.70) !important;
          box-shadow: 0 30px 60px rgba(10,37,64,0.28), 0 10px 20px rgba(10,37,64,0.14) !important;
        }
        .glass-page .card .card-header,
        .glass-page .card-header {
          background: rgba(255,255,255,0.35) !important;
          border-bottom: 1px solid rgba(255,255,255,0.6) !important;
        }
      `}</style>
      {/* Hero */}
      <div className="text-center py-5" style={{
        background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 50%, #6f42c1 100%)',
        borderRadius: '20px', marginTop: '1rem', marginBottom: '2rem',
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120,
          borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="mb-3">
            <span className="badge bg-white bg-opacity-25 px-3 py-2" style={{ fontSize: '0.8rem' }}>
              <i className="bi bi-shield-check me-1"></i>{t('license.secureLicensing')}
            </span>
          </div>
          <h1 className="display-4 fw-bold mb-2">{t('license.title')}</h1>
          <p className="lead mb-0 opacity-75" style={{ maxWidth: '600px', margin: '0 auto' }}>
            {t('license.subtitle')}
          </p>
        </div>
      </div>

      {/* Active License Banner */}
      {status?.valid && tierInfo && (
        <div className="mb-4" style={{
          background: `linear-gradient(135deg, ${tierInfo.color}15, ${tierInfo.color}05)`,
          border: `2px solid ${tierInfo.color}30`, borderRadius: '16px', padding: '1.5rem 2rem',
        }}>
          <div className="d-flex align-items-center flex-wrap gap-4">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 56, height: 56, background: `linear-gradient(135deg, ${tierInfo.color}, ${tierInfo.color}cc)` }}>
                <i className={`bi ${tierInfo.icon} text-white fs-4`}></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge fw-semibold" style={{
                    background: tierInfo.color, fontSize: '0.75rem', padding: '4px 10px' }}>
                    {t('license.tiers.' + status.tier, { defaultValue: tierInfo.label })}
                  </span>
                  <span className="badge bg-success" style={{ fontSize: '0.7rem' }}>
                    <i className="bi bi-check-circle me-1"></i>{t('license.active')}
                  </span>
                </div>
                <div className="small text-muted mt-1">
                  {status.customerName && <span className="fw-semibold">{status.customerName}</span>}
                  {status.maxUsers && <span> · {t('license.upTo')} {status.maxUsers} {t('license.users')}</span>}
                </div>
              </div>
            </div>
            <div className="ms-auto d-flex align-items-center gap-4">
              <div className="text-center">
                <div className="small text-muted text-uppercase">{t('license.daysLeft')}</div>
                <div className={`fs-4 fw-bold ${status.daysRemaining! > 30 ? 'text-success' : status.daysRemaining! > 7 ? 'text-warning' : 'text-danger'}`}>
                  {status.daysRemaining}
                </div>
              </div>
              <div className="text-center">
                <div className="small text-muted text-uppercase">{t('license.expires')}</div>
                <div className="small fw-semibold">{formatDate(status.expiresAt!)}</div>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3" style={{ height: 6, background: '#e9ecef', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${Math.min(100, ((status.daysRemaining || 0) / 365) * 100)}%`,
              background: `linear-gradient(90deg, ${tierInfo.color}, ${tierInfo.color}cc)`,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      {!status?.valid && (
        <div className="text-center mb-4 p-4" style={{
          background: 'linear-gradient(135deg, #fff3cd, #ffe69c)', borderRadius: '16px',
          border: '2px solid #ffc10740',
        }}>
          <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '2rem' }}></i>
          <h5 className="mt-2 text-warning">{t('license.noLicense')}</h5>
          <p className="text-muted small mb-0">{t('license.noLicenseMsg')}</p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0 fw-bold">{t('license.plans')}</h3>
          <div className="btn-group" style={{ background: '#f0f0f0', borderRadius: '10px', padding: 3 }}>
            <button className={`btn btn-sm ${billingCycle === 'monthly' ? 'btn-primary' : 'btn-light'}`}
              style={{ borderRadius: '8px', border: 'none' }}
              onClick={() => setBillingCycle('monthly')}>{t('license.monthly')}</button>
            <button className={`btn btn-sm ${billingCycle === 'yearly' ? 'btn-primary' : 'btn-light'}`}
              style={{ borderRadius: '8px', border: 'none' }}
              onClick={() => setBillingCycle('yearly')}>
              {t('license.yearly')} <span className="badge bg-success ms-1" style={{ fontSize: '0.6rem' }}>{t('license.saveTwenty')}</span>
            </button>
          </div>
        </div>

        <div className="row g-3">
          {PLANS.map((plan) => {
            const price = billingCycle === 'yearly'
              ? Math.round(parseInt(plan.price) * 12 * 0.8)
              : parseInt(plan.price);
            const isActive = status?.tier === plan.tier;
            return (
              <div className="col-md-4" key={plan.tier}>
                <div className="card h-100 shadow-sm" style={{
                  borderRadius: '16px', border: isActive ? '2px solid #0d6efd' : '1px solid #e0e0e0',
                  transform: plan.recommended ? 'scale(1.03)' : 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {plan.recommended && (
                    <div className="text-center py-1" style={{
                      background: 'linear-gradient(90deg, #0d6efd, #6610f2)', color: 'white',
                      fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px',
                    }}>{t('license.mostPopular')}</div>
                  )}
                  {isActive && (
                    <div className="text-center py-1" style={{
                      background: '#198754', color: 'white',
                      fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px',
                    }}>{t('license.currentPlan')}</div>
                  )}
                  <div className="card-body d-flex flex-column p-4">
                    <div className="text-center mb-3">
                      <i className={`bi ${TIER_INFO[plan.tier]?.icon || 'bi-star'} fs-3`}
                        style={{ color: TIER_INFO[plan.tier]?.color || '#0d6efd' }}></i>
                      <h5 className="mt-2 mb-0 fw-bold">{t('license.tiers.' + plan.tier, { defaultValue: TIER_INFO[plan.tier]?.label || plan.tier })}</h5>
                    </div>
                    <div className="text-center mb-3">
                      <span className="display-5 fw-bold">${price}</span>
                      <span className="text-muted">{billingCycle === 'monthly' ? t('license.perMonth') : t('license.perYear')}</span>
                    </div>
                    <div className="text-center mb-3">
                      <span className="badge bg-light text-dark">{t('license.upTo')} {plan.users} {t('license.users')}</span>
                    </div>
                    <ul className="list-unstyled small mb-4 flex-grow-1">
                      {(Array.isArray(t('license.features_' + plan.tier, { returnObjects: true }))
                        ? (t('license.features_' + plan.tier, { returnObjects: true }) as string[])
                        : plan.features).map((f) => (
                        <li key={f} className="mb-2 d-flex align-items-center gap-2">
                          <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '0.8rem' }}></i>
                          <span>{f}</span>
                        </li>
                      ))}
                      {(Array.isArray(t('license.excluded_' + plan.tier, { returnObjects: true }))
                        ? (t('license.excluded_' + plan.tier, { returnObjects: true }) as string[])
                        : plan.excluded).map((f) => (
                        <li key={f} className="mb-2 d-flex align-items-center gap-2 text-muted opacity-50">
                          <i className="bi bi-dash-circle" style={{ fontSize: '0.8rem' }}></i>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button className={`btn w-100 ${isActive ? 'btn-success' : plan.recommended ? 'btn-primary' : 'btn-outline-primary'}`}
                      style={{ borderRadius: '10px' }} disabled={isActive}
                      onClick={() => document.getElementById('activate-section')?.scrollIntoView({ behavior: 'smooth' })}>
                      {isActive ? t('license.currentPlan') : t('license.getStarted')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activation Section */}
      <div id="activate-section" className="card shadow-sm mb-4" style={{
        borderRadius: '16px', border: '1px solid #e0e0e0', overflow: 'hidden',
      }}>
        <div className="card-header bg-white border-bottom py-3">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <div className="rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #0d6efd, #6610f2)' }}>
              <i className="bi bi-key-fill text-white small"></i>
            </div>
            {status?.valid ? t('license.renewUpgrade') : t('license.activateLicense')}
          </h5>
        </div>
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            <div className="col-md-7">
              <label className="form-label small fw-semibold text-uppercase text-muted">{t('license.licenseKey')}</label>
              <input className="form-control form-control-lg"
                style={{ fontFamily: 'monospace', letterSpacing: '0.08em', borderRadius: '12px', fontSize: '0.95rem' }}
                placeholder={t('license.licenseKeyPlaceholder')}
                value={key}
                onChange={(e) => { setKey(e.target.value.toUpperCase()); setError(''); setSuccess(''); }} />
            </div>
            <div className="col-md-5">
              <label className="form-label small fw-semibold text-uppercase text-muted">{t('license.organization')} ({t('license.optional')})</label>
              <input className="form-control" style={{ borderRadius: '12px' }}
                placeholder={t('license.organizationPlaceholder')}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="alert alert-danger small py-2 mt-3 mb-0" style={{ borderRadius: '10px' }}>
              <i className="bi bi-exclamation-triangle me-1"></i>{error}
            </div>
          )}
          {success && (
            <div className="alert alert-success small py-2 mt-3 mb-0" style={{ borderRadius: '10px' }}>
              <i className="bi bi-check-circle me-1"></i>{success}
            </div>
          )}

          <button className="btn btn-primary btn-lg w-100 mt-3" style={{ borderRadius: '12px' }}
            onClick={() => { if (key) activateMutation.mutate(); }}
            disabled={!key || activateMutation.isPending}>
            {activateMutation.isPending ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>{t('license.activating')}</>
            ) : (
              <><i className="bi bi-shield-check me-2"></i>{status?.valid ? t('license.activateNew') : t('license.activateLicense')}</>
            )}
          </button>

          <div className="d-flex justify-content-center gap-4 mt-3">
            <small className="text-muted">
              <i className="bi bi-wifi-off me-1"></i>{t('license.worksOffline')}
            </small>
            <small className="text-muted">
              <i className="bi bi-shield-lock me-1"></i>{t('license.hmacSecured')}
            </small>
            <small className="text-muted">
              <i className="bi bi-arrow-repeat me-1"></i>{t('license.instantActivation')}
            </small>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="text-center mb-4" style={{ padding: '2rem', background: '#f8f9fa', borderRadius: '16px' }}>
        <h5 className="fw-bold mb-3">{t('license.faqTitle')}</h5>
        <div className="row g-3 text-start">
          {[
            { q: t('license.faq.q1'), a: t('license.faq.a1') },
            { q: t('license.faq.q2'), a: t('license.faq.a2') },
            { q: t('license.faq.q3'), a: t('license.faq.a3') },
            { q: t('license.faq.q4'), a: t('license.faq.a4') },
          ].map((faq, i) => (
            <div className="col-md-6" key={i}>
              <div className="small">
                <strong>{faq.q}</strong>
                <p className="text-muted mt-1 mb-0">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
