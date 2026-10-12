import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import nestClient from '../../api/nest-client';

export default function SurveillancePage() {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: conditions = [] } = useQuery({
    queryKey: ['surveillance', 'conditions'],
    queryFn: async () => { const r = await nestClient.get('/patients/1/conditions'); return r.data; },
  });

  const { data: appointments } = useQuery({
    queryKey: ['surveillance', 'appts', startDate, endDate],
    queryFn: async () => { const r = await nestClient.get('/reports/appointments', { params: { startDate, endDate } }); return r.data; },
  });

  const { data: encounters } = useQuery({
    queryKey: ['surveillance', 'encounters', startDate, endDate],
    queryFn: async () => { const r = await nestClient.get('/reports/encounters', { params: { startDate, endDate } }); return r.data; },
  });

  // Simulated surveillance alerts
  const alerts = [
    { condition: 'Influenza-like Illness', count: Math.floor(Math.random() * 5), threshold: 3, status: Math.random() > 0.5 ? 'alert' : 'normal' },
    { condition: 'COVID-19 Suspected', count: Math.floor(Math.random() * 3), threshold: 2, status: Math.random() > 0.7 ? 'alert' : 'normal' },
    { condition: 'Hypertension', count: conditions.length, threshold: 5, status: conditions.length > 5 ? 'alert' : 'normal' },
    { condition: 'Diabetes', count: Math.floor(Math.random() * 4), threshold: 3, status: Math.random() > 0.6 ? 'alert' : 'normal' },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1"><i className="bi bi-broadcast me-2"></i>{t('reports.surveillance.title')}</h3>
          <p className="text-muted small mb-0">{t('reports.surveillance.subtitle')}</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span>{t('reports.surveillance.to')}</span>
          <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 text-bg-primary"><div className="card-body text-center"><h2>{appointments?.total || 0}</h2><small>{t('reports.surveillance.appointments')}</small></div></div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 text-bg-success"><div className="card-body text-center"><h2>{encounters?.total || 0}</h2><small>{t('reports.surveillance.encounters')}</small></div></div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 text-bg-warning"><div className="card-body text-center"><h2>{alerts.filter(a => a.status === 'alert').length}</h2><small>{t('reports.surveillance.activeAlerts')}</small></div></div>
        </div>
        <div className="col-md-3">
          <button className="btn btn-outline-danger w-100 h-100" onClick={() => alert(t('reports.surveillance.submitted'))}><i className="bi bi-send me-2"></i>{t('reports.surveillance.submitReport')}</button>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header"><h5 className="mb-0">{t('reports.surveillance.syndromeAlerts')}</h5></div>
        <div className="card-body p-0">
          <table className="table table-sm table-hover mb-0">
            <thead><tr><th>{t('reports.surveillance.cols.condition')}</th><th>{t('reports.surveillance.cols.count')}</th><th>{t('reports.surveillance.cols.threshold')}</th><th>{t('reports.surveillance.cols.status')}</th></tr></thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.condition} className={a.status === 'alert' ? 'table-danger' : ''}>
                  <td><strong>{a.condition}</strong></td><td>{a.count}</td><td>{a.threshold}</td>
                  <td><span className={`badge ${a.status === 'alert' ? 'bg-danger' : 'bg-success'}`}>{a.status === 'alert' ? t('reports.surveillance.alert') : t('reports.surveillance.normal')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
