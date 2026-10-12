import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import nestClient from '../../api/nest-client';
import { formatVital, formatBP, formatVitalUnit } from '../../utils/vitalsClassify';

export default function PatientPortalDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const raw = localStorage.getItem('portal_patient');
  const patient = raw ? JSON.parse(raw) : null;
  if (!patient) { navigate('/portal/login'); return null; }

  const { data: records } = useQuery({
    queryKey: ['portal-records', patient.pid],
    queryFn: async () => {
      const r = await nestClient.get('/portal/records', { headers: { Authorization: `Bearer ${patient.token}` } });
      return r.data;
    },
  });
  const appointments = records?.appointments || [];
  const medications = records?.medications || [];
  const vitals = records?.vitals || [];
  const allergies = records?.allergies || [];
  const conditions = records?.conditions || [];
  const procedures = records?.procedures || [];

  const handleLogout = () => { localStorage.removeItem('portal_patient'); navigate('/portal/login'); };

  return (
    <div className="min-vh-100 glass-page position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #f5faff 45%, #d1fae5 100%)' }}>
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
        .glass-page .table thead.table-light {
          background: rgba(255,255,255,0.35) !important;
        }
      `}</style>
      <nav className="navbar navbar-expand-lg navbar-dark shadow-sm px-4 position-relative" style={{ background: 'linear-gradient(90deg, #0d6efd, #00c9a7)', zIndex: 1 }}>
        <div className="container-fluid">
          <a className="navbar-brand" href="#"><i className="bi bi-heart-pulse me-2"></i>{t('portal.login.title')}</a>
          <div className="d-flex align-items-center gap-3">
            <span className="text-white small">Welcome, {patient.name}</span>
            <button className="btn btn-outline-light btn-sm" onClick={() => navigate('/portal/message')}><i className="bi bi-chat-dots me-1"></i>{t('portal.dashboard.navMessage')}</button>
            <button className="btn btn-outline-light btn-sm" onClick={() => navigate('/portal/payment')}><i className="bi bi-credit-card me-1"></i>{t('portal.dashboard.navPay')}</button>
            <button className="btn btn-outline-light btn-sm" onClick={() => navigate('/portal/records')}><i className="bi bi-download me-1"></i>{t('portal.dashboard.navRecords')}</button>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}><i className="bi bi-box-arrow-right"></i></button>
          </div>
        </div>
      </nav>

      <div className="container py-4">
        <div className="row g-3 mb-4">
          {[
            { label: t('portal.dashboard.appointments'), count: appointments.length, icon: 'bi-calendar-event', color: 'primary', path: '/portal/appointments' },
            { label: t('portal.dashboard.medications'), count: medications.filter((m:any) => m.active).length, icon: 'bi-capsule', color: 'success', path: '/portal/medications' },
            { label: t('portal.dashboard.labResults'), count: procedures.length, icon: 'bi-flask', color: 'info', path: '/portal/labs' },
            { label: t('portal.dashboard.allergies'), count: allergies.length, icon: 'bi-exclamation-triangle', color: 'warning', path: '/portal/allergies' },
            { label: t('portal.dashboard.diagnoses'), count: conditions.length, icon: 'bi-clipboard2-pulse', color: 'danger', path: '/portal/conditions' },
            { label: t('portal.dashboard.vitals'), count: vitals.length, icon: 'bi-heart-pulse', color: 'secondary', path: '/portal/vitals' },
          ].map(card => (
            <div className="col-md-2" key={card.label}>
              <div className={`card shadow-sm border-0 h-100 text-bg-${card.color} bg-gradient`} style={{cursor:'pointer'}} onClick={() => navigate(card.path)}>
                <div className="card-body text-center"><i className={`bi ${card.icon} fs-3`}></i><h4 className="mt-2 mb-0">{card.count}</h4><small>{card.label}</small></div>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <div className="card shadow-sm"><div className="card-header"><h6 className="mb-0"><i className="bi bi-calendar-event me-2"></i>{t('portal.dashboard.upcoming')}</h6></div>
              <div className="card-body p-0"><table className="table table-sm mb-0"><thead><tr><th>{t('portal.dashboard.cols.date')}</th><th>{t('portal.dashboard.cols.time')}</th><th>{t('portal.dashboard.cols.title')}</th><th>{t('portal.dashboard.cols.status')}</th></tr></thead>
                <tbody>{appointments.slice(0, 5).map((a:any) => <tr key={a.pc_eid}><td>{a.pc_eventDate}</td><td>{a.pc_startTime}</td><td>{a.pc_title}</td><td><span className="badge bg-info">{a.pc_apptstatus || 'Scheduled'}</span></td></tr>)}
                  {!appointments.length && <tr><td colSpan={4} className="text-muted text-center py-3">{t('portal.dashboard.noAppointments')}</td></tr>}</tbody></table></div></div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm"><div className="card-header"><h6 className="mb-0"><i className="bi bi-capsule me-2"></i>{t('portal.dashboard.currentMeds')}</h6></div>
              <div className="card-body p-0"><table className="table table-sm mb-0"><thead><tr><th>{t('portal.dashboard.cols.drug')}</th><th>{t('portal.dashboard.cols.dosage')}</th><th>{t('portal.dashboard.cols.route')}</th><th>{t('portal.dashboard.cols.start')}</th></tr></thead>
                <tbody>{medications.filter((m:any)=>m.active).slice(0,5).map((m:any) => <tr key={m.id}><td><strong>{m.drug}</strong></td><td>{m.dosage||'—'}</td><td>{m.route||'—'}</td><td>{m.start_date||'—'}</td></tr>)}
                  {!medications.length && <tr><td colSpan={4} className="text-muted text-center py-3">{t('portal.dashboard.noMedications')}</td></tr>}</tbody></table></div></div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm"><div className="card-header"><h6 className="mb-0"><i className="bi bi-heart-pulse me-2"></i>{t('portal.dashboard.recentVitals')}</h6></div>
              <div className="card-body p-0"><table className="table table-sm mb-0"><thead><tr><th>{t('portal.dashboard.cols.date')}</th><th>{t('portal.dashboard.cols.bp')}</th><th>{t('portal.dashboard.cols.pulse')}</th><th>{t('portal.dashboard.cols.weight')}</th><th>{t('portal.dashboard.cols.bmi')}</th></tr></thead>
                <tbody>{vitals.slice(0,5).map((v:any) => <tr key={v.id}><td>{v.date}</td><td>{formatBP(v.bps, v.bpd)}</td><td>{formatVital(v.pulse)}</td><td>{formatVitalUnit(v.weight, 1, ' kg')}</td><td>{formatVital(v.BMI, 1)}</td></tr>)}
                  {!vitals.length && <tr><td colSpan={5} className="text-muted text-center py-3">{t('portal.dashboard.noVitals')}</td></tr>}</tbody></table></div></div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm"><div className="card-header"><h6 className="mb-0"><i className="bi bi-exclamation-triangle me-2"></i>{t('portal.dashboard.allergies')}</h6></div>
              <div className="card-body p-0"><table className="table table-sm mb-0"><thead><tr><th>{t('portal.dashboard.cols.allergen')}</th><th>{t('portal.dashboard.cols.reaction')}</th></tr></thead>
                <tbody>{allergies.slice(0,5).map((a:any) => <tr key={a.id}><td><strong>{a.allergen || a.title}</strong></td><td>{a.reaction || '—'}</td></tr>)}
                  {!allergies.length && <tr><td colSpan={2} className="text-muted text-center py-3">{t('portal.dashboard.noAllergies')}</td></tr>}</tbody></table></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
