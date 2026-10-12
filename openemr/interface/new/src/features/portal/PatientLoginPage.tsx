import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import nestClient from '../../api/nest-client';

export default function PatientLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pid, setPid] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await nestClient.post('/portal/login', {
        publicId: pid.trim(),
        password,
        // Date of birth is an optional second check for a patient who supplies
        // it. The password is the credential.
        dob: dob || undefined,
      });
      const patient = res.data;
      localStorage.setItem('portal_patient', JSON.stringify({
        pid: patient.pid,
        name: patient.name,
        dob: patient.dob,
        token: patient.token,
        mustChangePassword: patient.mustChangePassword,
      }));
      // A password issued at the desk has to be replaced before the chart
      // opens, so send the patient straight to the change screen.
      navigate(
        patient.mustChangePassword ? '/portal/change-password' : '/portal/dashboard',
        { replace: true },
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || t('portal.login.invalid'));
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a2540 0%, #0d6efd 45%, #00c9a7 100%)' }}>
      <div className="position-absolute rounded-circle" style={{ width: '360px', height: '360px', top: '-100px', left: '-80px', background: 'radial-gradient(circle, rgba(0,201,167,0.45), transparent 70%)', filter: 'blur(18px)' }}></div>
      <div className="position-absolute rounded-circle" style={{ width: '420px', height: '420px', bottom: '-120px', right: '-100px', background: 'radial-gradient(circle, rgba(13,110,253,0.45), transparent 70%)', filter: 'blur(18px)' }}></div>
      <div className="card shadow position-relative" style={{ width: '400px', borderRadius: '24px', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.6)' }}>
        <div className="card-body p-4 text-center">
          <div className="mb-4">
            <i className="bi bi-heart-pulse text-success" style={{ fontSize: '3rem' }}></i>
            <h2 className="mt-2">{t('portal.login.title')}</h2>
            <p className="text-muted">{t('portal.login.subtitle')}</p>
          </div>
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="mb-3 text-start">
              <label className="form-label">{t('portal.login.patientId')}</label>
              <input type="text" className="form-control" value={pid} onChange={e => setPid(e.target.value)} placeholder={t('portal.login.patientIdPlaceholder')} required autoComplete="username" />
            </div>
            <div className="mb-3 text-start">
              <label className="form-label">{t('portal.login.password')}</label>
              <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('portal.login.passwordPlaceholder')} required autoComplete="current-password" />
              <div className="form-text">
                {t('portal.login.pidHint')}
              </div>
            </div>
            <div className="mb-3 text-start">
              <label className="form-label">{t('portal.login.dob')} <span className="text-muted fw-normal">{t('portal.login.optional')}</span></label>
              <input type="date" className="form-control" value={dob} onChange={e => setDob(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-success btn-lg w-100">{t('portal.login.signIn')}</button>
          </form>
          <div className="mt-3 d-flex justify-content-between">
            <Link to="/portal/register" className="small text-success">{t('portal.login.register')}</Link>
            <Link to="/login" className="small text-muted">{t('portal.login.staffLogin')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
