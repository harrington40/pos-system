import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import nestClient from '../../api/nest-client';
import PhoneInput from '../../components/shared/PhoneInput';
import CitySelect from '../../components/shared/CitySelect';
import { isInvalidLiberiaNationalNumber } from '../../utils/liberia';

export default function PatientRegistrationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fname:'', lname:'', DOB:'', sex:'', email:'', phone_contact:'', street:'', city:'', country:'' });
  const [registered, setRegistered] = useState<{ id: number; name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const register = useMutation({
    mutationFn: (d: any) => nestClient.post('/portal/register', d),
    onSuccess: (res: any) => setRegistered({
      id: res.data.publicId,
      name: res.data.name || `${form.fname} ${form.lname}`,
      password: res.data.password || '',
    }),
    onError: (e: any) => setError(e?.response?.data?.message || 'Registration failed. Please try again.'),
  });

  if (registered) {
    return (<div className="min-vh-100 d-flex align-items-center justify-content-center position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a2540 0%, #0d6efd 45%, #00c9a7 100%)' }}>
      <div className="card shadow text-center position-relative" style={{width:'420px', borderRadius:'24px', background:'rgba(255,255,255,0.88)', backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)', border:'1px solid rgba(255,255,255,0.6)'}}><div className="card-body py-5">
        <i className="bi bi-check-circle text-success" style={{fontSize:'4rem'}}></i>
        <h4 className="mt-3">{t('portal.registration.complete')}</h4>
        <p className="text-muted">Welcome, {registered.name}.</p>
        <div className="text-start small">
          <div className="mb-2">
            <span className="text-muted">{t('portal.registration.patientIdLabel')}</span>
            <div className="fw-bold fs-5">{registered.id}</div>
          </div>
          {registered.password && (
            <div className="mb-2">
              <span className="text-muted">{t('portal.registration.passwordLabel')}</span>
              <div className="d-flex align-items-center gap-2">
                <code className="fs-6 flex-grow-1 p-2 rounded bg-light border text-break">{registered.password}</code>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    navigator.clipboard?.writeText(registered.password);
                    setCopied(true);
                  }}>
                  <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'}`}></i>
                </button>
              </div>
            </div>
          )}
        </div>
        {/* The password is not stored anywhere in readable form, so this screen
            is the only chance to record it. */}
        <div className="alert alert-warning small py-2 mt-3 text-start">
          <i className="bi bi-exclamation-triangle me-1"></i>
          <strong>{t('portal.registration.writeItDown')}</strong> It cannot be shown again, and you will
          be asked to choose your own the first time you sign in.
        </div>
        <button className="btn btn-success w-100" onClick={() => navigate('/portal/login')}>{t('portal.registration.signInToPortal')}</button>
      </div></div></div>);
  }

  return (
    <div className="min-vh-100 py-4 position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a2540 0%, #0d6efd 45%, #00c9a7 100%)' }}>
      <div className="position-absolute rounded-circle" style={{ width: '360px', height: '360px', top: '-100px', left: '-80px', background: 'radial-gradient(circle, rgba(0,201,167,0.45), transparent 70%)', filter: 'blur(18px)' }}></div>
      <div className="position-absolute rounded-circle" style={{ width: '420px', height: '420px', bottom: '-120px', right: '-100px', background: 'radial-gradient(circle, rgba(13,110,253,0.45), transparent 70%)', filter: 'blur(18px)' }}></div>
      <div className="container position-relative"><div className="row justify-content-center"><div className="col-md-6">
        <div className="card shadow-sm" style={{ borderRadius:'24px', background:'rgba(255,255,255,0.88)', backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)', border:'1px solid rgba(255,255,255,0.6)' }}><div className="card-header text-white" style={{ background:'linear-gradient(90deg, #198754, #00c9a7)', borderRadius:'24px 24px 0 0' }}><h5 className="mb-0"><i className="bi bi-person-plus me-2"></i>{t('portal.registration.title')}</h5></div>
          <div className="card-body">
            {error && <div className="alert alert-danger small py-2"><i className="bi bi-exclamation-triangle me-1"></i>{error}</div>}
            <div className="row g-2">
              <div className="col-md-6"><label className="form-label small">{t('portal.registration.firstName')}</label><input className="form-control form-control-sm" value={form.fname} onChange={e=>setForm({...form,fname:e.target.value})} required /></div>
              <div className="col-md-6"><label className="form-label small">{t('portal.registration.lastName')}</label><input className="form-control form-control-sm" value={form.lname} onChange={e=>setForm({...form,lname:e.target.value})} required /></div>
              <div className="col-md-6"><label className="form-label small">{t('portal.registration.dob')}</label><input className="form-control form-control-sm" type="date" value={form.DOB} onChange={e=>setForm({...form,DOB:e.target.value})} /></div>
              <div className="col-md-6"><label className="form-label small">{t('portal.registration.sex')}</label><select className="form-select form-select-sm" value={form.sex} onChange={e=>setForm({...form,sex:e.target.value})}><option value="">—</option><option value="Male">{t('portal.registration.male')}</option><option value="Female">{t('portal.registration.female')}</option></select></div>
              <div className="col-md-6"><label className="form-label small">{t('portal.registration.email')}</label><input className="form-control form-control-sm" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              <div className="col-md-6"><label className="form-label small">{t('portal.registration.phone')}</label><PhoneInput value={form.phone_contact} onChange={v => setForm({...form, phone_contact: v})} /></div>
              <div className="col-12"><label className="form-label small">{t('portal.registration.street')}</label><input className="form-control form-control-sm" value={form.street} onChange={e=>setForm({...form,street:e.target.value})} /></div>
              <div className="col-md-5"><label className="form-label small">{t('portal.registration.city')}</label><CitySelect value={form.city} onChange={v => setForm({...form, city: v})} /></div>
              <div className="col-md-7"><label className="form-label small">{t('portal.registration.country')}</label><select className="form-select form-select-sm" value={form.country} onChange={e=>setForm({...form,country:e.target.value})}><option value="">{t('portal.registration.select')}</option><option>Liberia</option><option>Ivory Coast</option><option>Sierra Leone</option></select></div>
              <div className="col-12 mt-2">
                <button className="btn btn-success w-100" onClick={()=>register.mutate(form)} disabled={register.isPending||!form.fname||!form.lname||isInvalidLiberiaNationalNumber(form.phone_contact)}>
                  {register.isPending?t('portal.registration.registering'):t('portal.registration.completeBtn')}
                </button>
              </div>
            </div>
          </div></div>
        <div className="text-center mt-3"><Link to="/portal/login" className="small text-muted">{t('portal.registration.alreadyRegistered')}</Link></div>
      </div></div></div>
    </div>
  );
}
