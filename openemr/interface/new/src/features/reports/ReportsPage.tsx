import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAppointments } from '../../api/endpoints/appointments';
import nestClient from '../../api/nest-client';
import { useCurrency } from '../../hooks/useCurrency';
import { formatMoney } from '../../utils/currency';
import CurrencySwitcher from '../../components/shared/CurrencySwitcher';
import { formatDateHuman, toDateInput } from '../../utils/date';
import { chartPatientId } from '../../utils/patientChart';

type ReportTab = 'appointments' | 'patients' | 'financial';

const RANGES = [
  { key: '7', label: '7d' },
  { key: '30', label: '30d' },
  { key: '90', label: '90d' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
];

/** Percentage share, guarding against a zero total. */
const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 1000) / 10 : 0;

const STATUS_COLORS: Record<string, string> = {
  '-': '#0d6efd',
  '?': '#0dcaf0',
  '+': '#198754',
  'x': '#dc3545',
  '@': '#fd7e14',
  Checkout: '#198754',
  'Checked Out': '#198754',
  'Checked In': '#0dcaf0',
  'Not Checked In': '#ffc107',
  Cancelled: '#dc3545',
  'No Show': '#dc3545',
};

const statusColor = (status: string) => STATUS_COLORS[status] ?? '#6c757d';

/** Compact KPI tile. */
function KpiTile({ icon, label, value, sub, color }: {
  icon: string; label: string; value: ReactNode; sub?: string; color: string;
}) {
  return (
    <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '18px' }}>
      <div className="card-body d-flex align-items-center gap-3">
        <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: '46px', height: '46px', backgroundColor: `${color}1a` }}>
          <i className={`bi ${icon}`} style={{ color, fontSize: '1.25rem' }}></i>
        </div>
        <div className="min-w-0">
          <div className="text-muted text-uppercase" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>{label}</div>
          <div className="fs-4 fw-bold lh-1">{value}</div>
          {sub && <small className="text-muted" style={{ fontSize: '0.65rem' }}>{sub}</small>}
        </div>
      </div>
    </div>
  );
}

/** Labelled progress bar used for every share/breakdown. */
function BarRow({ label, value, total, color, right }: {
  label: string; value: number; total: number; color: string; right?: string;
}) {
  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between small">
        <span className="text-truncate text-capitalize">{label}</span>
        <span className="fw-semibold ms-2">{right ?? value}</span>
      </div>
      <div className="progress" style={{ height: '6px' }}>
        <div className="progress-bar" style={{ width: `${Math.max(2, pct(value, total))}%`, backgroundColor: color }}></div>
      </div>
    </div>
  );
}

function Panel({ title, icon, actions, children }: {
  title: string; icon: string; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '18px' }}>
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3" style={{ borderRadius: '18px 18px 0 0' }}>
        <h6 className="mb-0 fw-bold"><i className={`bi ${icon} me-2 text-primary`}></i>{title}</h6>
        {actions}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currency, exchangeRate } = useCurrency();

  const [activeTab, setActiveTab] = useState<ReportTab>('appointments');
  const [rangeKey, setRangeKey] = useState('30');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toDateInput(d);
  });
  const [dateTo, setDateTo] = useState(() => toDateInput(new Date()));

  const applyRange = (key: string) => {
    setRangeKey(key);
    const today = new Date();
    if (key === 'all') {
      setDateFrom('2000-01-01');
      setDateTo(toDateInput(today));
      return;
    }
    if (key === 'month') {
      setDateFrom(toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
      setDateTo(toDateInput(today));
      return;
    }
    if (key === 'year') {
      setDateFrom(toDateInput(new Date(today.getFullYear(), 0, 1)));
      setDateTo(toDateInput(today));
      return;
    }
    const days = Number(key) || 30;
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    setDateFrom(toDateInput(start));
    setDateTo(toDateInput(today));
  };

  const range = { startDate: dateFrom, endDate: dateTo };
  const money = (usd: number) => formatMoney(usd, currency, exchangeRate);

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['reports', 'appointments', dateFrom, dateTo],
    queryFn: () => getAppointments(range),
    enabled: activeTab === 'appointments',
  });

  const { data: patientReport, isLoading: loadingPatients } = useQuery({
    queryKey: ['reports', 'patients', dateFrom, dateTo],
    queryFn: async () => {
      const r = await nestClient.get('/reports/patients', { params: range });
      return r.data;
    },
    enabled: activeTab === 'patients',
  });

  const { data: financialReport, isLoading: loadingFinancial } = useQuery({
    queryKey: ['reports', 'financial', dateFrom, dateTo],
    queryFn: async () => {
      const r = await nestClient.get('/billing/financial-report', { params: range });
      return r.data;
    },
    enabled: activeTab === 'financial',
  });

  // ── Appointment KPIs ────────────────────────────────────────────
  const totalAppointments = appointments.length;
  const uniquePatients = new Set(appointments.map((a) => a.pc_pid)).size;

  const daysInPeriod = useMemo(() => {
    const a = new Date(`${dateFrom}T00:00:00`).getTime();
    const b = new Date(`${dateTo}T00:00:00`).getTime();
    if (isNaN(a) || isNaN(b) || b < a) return 1;
    return Math.round((b - a) / 86400000) + 1;
  }, [dateFrom, dateTo]);

  const avgPerDay = Math.round((totalAppointments / Math.max(1, daysInPeriod)) * 10) / 10;

  const statusCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const a of appointments) {
      const s = (a.pc_apptstatus || '').trim() || 'Unknown';
      acc[s] = (acc[s] || 0) + 1;
    }
    return Object.entries(acc).sort((x, y) => y[1] - x[1]);
  }, [appointments]);

  const openChart = (idLike: unknown, pidLike?: unknown) => {
    const cid = chartPatientId(idLike, pidLike);
    if (cid) navigate(`/patients/${cid}`);
  };

  // ── Patient report shapes ───────────────────────────────────────
  const pSex: any[] = patientReport?.bySex || [];
  const pStatus: any[] = patientReport?.byStatus || [];
  const pAges: any[] = patientReport?.ageBands || [];
  const pMonthly: any[] = patientReport?.monthly || [];
  const pRecent: any[] = patientReport?.recent || [];
  const pTotal: number = patientReport?.total || 0;
  const pActive: number = patientReport?.active || 0;
  const pNew: number = patientReport?.last30 || 0;
  const pThisYear: number = patientReport?.thisYear || 0;
  const sexTotal = pSex.reduce((n, r) => n + Number(r.count || 0), 0);
  const ageTotal = pAges.reduce((n, r) => n + Number(r.count || 0), 0);
  const monthlyMax = Math.max(1, ...pMonthly.map((m) => Number(m.count || 0)));

  // ── Financial shapes ────────────────────────────────────────────
  const fin = financialReport || null;
  const categories: any[] = fin?.byCategory || [];
  const outstanding: any[] = fin?.outstanding || [];

  return (
    <div className="glass-page position-relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #f5faff 45%, #d1fae5 100%)', borderRadius: '20px', minHeight: '100vh', padding: '16px' }}>
      <style>{`
        .glass-page .card { position: relative; z-index: 1; background: rgba(255,255,255,0.72) !important; backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,0.9) !important; }
        .glass-page .card-header { background: rgba(255,255,255,0.6) !important; }
      `}</style>

      {/* Header */}
      <div className="rounded-4 p-4 mb-3 text-white position-relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 55%, #00c9a7 100%)', zIndex: 1 }}>
        <div className="position-absolute end-0 top-0 opacity-10" style={{ fontSize: '7rem', transform: 'rotate(10deg) translate(20px,-10px)' }}>
          <i className="bi bi-graph-up-arrow"></i>
        </div>
        <div className="position-relative d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h2 className="mb-1 fw-bold"><i className="bi bi-graph-up-arrow me-2"></i>{t('reports.title')}</h2>
            <p className="mb-0 text-white text-opacity-75 small">
              <i className="bi bi-calendar-range me-1"></i>
              {t('reports.rangeSummary', { from: formatDateHuman(dateFrom), to: formatDateHuman(dateTo), days: t('reports.dayCount', { count: daysInPeriod }) })}
            </p>
          </div>
          <div className="bg-white bg-opacity-15 rounded-3 p-1"><CurrencySwitcher /></div>
        </div>
      </div>

      {/* Range filter */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '18px' }}>
        <div className="card-body py-2 d-flex flex-wrap align-items-center gap-2">
          <div className="btn-group btn-group-sm" role="group">
            {RANGES.map((r) => (
              <button key={r.key} type="button"
                className={`btn ${rangeKey === r.key ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => applyRange(r.key)}>
                {t('reports.range.' + r.key, { defaultValue: r.label })}
              </button>
            ))}
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted mb-0">{t('reports.from')}</label>
            <input type="date" className="form-control form-control-sm" style={{ width: '150px' }}
              value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setRangeKey('custom'); }} />
            <label className="small text-muted mb-0">{t('reports.to')}</label>
            <input type="date" className="form-control form-control-sm" style={{ width: '150px' }}
              value={dateTo} onChange={(e) => { setDateTo(e.target.value); setRangeKey('custom'); }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills gap-2 mb-3">
        {([
          { id: 'appointments' as ReportTab, label: t('reports.tabs.appointments'), icon: 'bi-calendar-check' },
          { id: 'patients' as ReportTab, label: t('reports.tabs.patients'), icon: 'bi-people' },
          { id: 'financial' as ReportTab, label: t('reports.tabs.financial'), icon: 'bi-cash-stack' },
        ]).map((tab) => (
          <li className="nav-item" key={tab.id}>
            <button className={`nav-link rounded-pill ${activeTab === tab.id ? 'active' : 'text-dark bg-white'}`}
              onClick={() => setActiveTab(tab.id)}>
              <i className={`bi ${tab.icon} me-1`}></i>{tab.label}
            </button>
          </li>
        ))}
      </ul>

      {/* ── Appointments ─────────────────────────────────────────── */}
      {activeTab === 'appointments' && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-lg-3"><KpiTile icon="bi-calendar-check" color="#0d6efd" label={t('reports.kpi.appointments')} value={totalAppointments} sub={t('reports.kpi.inRange')} /></div>
            <div className="col-6 col-lg-3"><KpiTile icon="bi-people" color="#198754" label={t('reports.kpi.uniquePatients')} value={uniquePatients} sub={t('reports.kpi.distinct')} /></div>
            <div className="col-6 col-lg-3"><KpiTile icon="bi-calendar-range" color="#0dcaf0" label={t('reports.kpi.daysInPeriod')} value={daysInPeriod} /></div>
            <div className="col-6 col-lg-3"><KpiTile icon="bi-speedometer" color="#fd7e14" label={t('reports.kpi.avgPerDay')} value={avgPerDay} /></div>
          </div>

          <div className="row g-3">
            <div className="col-lg-4">
              <Panel title={t('reports.panels.statusBreakdown')} icon="bi-pie-chart">
                {statusCounts.length === 0 && <div className="text-muted small text-center py-3">{t('reports.panels.noAppointments')}</div>}
                {statusCounts.map(([status, count]) => (
                  <BarRow key={status} label={status} value={count} total={totalAppointments}
                    color={statusColor(status)} right={`${count} · ${pct(count, totalAppointments)}%`} />
                ))}
              </Panel>
            </div>
            <div className="col-lg-8">
              <Panel title={t('reports.panels.appointmentDetails')} icon="bi-list-check"
                actions={<span className="badge bg-primary rounded-pill">{totalAppointments}</span>}>
                <div className="table-responsive" style={{ maxHeight: '460px' }}>
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light sticky-top">
                      <tr><th>{t('reports.cols.date')}</th><th>{t('reports.cols.time')}</th><th>{t('reports.cols.patient')}</th><th>{t('reports.cols.reason')}</th><th>{t('reports.cols.provider')}</th><th>{t('reports.cols.status')}</th></tr>
                    </thead>
                    <tbody>
                      {loadingAppointments ? (
                        <tr><td colSpan={6} className="text-center py-3"><div className="spinner-border spinner-border-sm"></div></td></tr>
                      ) : appointments.length === 0 ? (
                        <tr><td colSpan={6} className="text-center text-muted py-4">{t('reports.panels.noAppointments')}</td></tr>
                      ) : appointments.map((apt) => (
                        <tr key={apt.pc_eid} style={{ cursor: 'pointer' }}
                          onClick={() => openChart(apt.patient_id, apt.pc_pid)}>
                          <td className="text-nowrap">{formatDateHuman(apt.pc_eventDate)}</td>
                          <td className="text-nowrap">{apt.pc_startTime?.substring(0, 5) || '—'}</td>
                          <td className="text-nowrap">{apt.lname}, {apt.fname}</td>
                          <td className="text-truncate" style={{ maxWidth: '180px' }}>{apt.pc_title || '—'}</td>
                          <td className="text-nowrap">{([apt.pce_aid_fname, apt.pce_aid_lname].filter(Boolean).join(' ')) || apt.pc_aid || '—'}</td>
                          <td>
                            <span className="badge rounded-pill" style={{ backgroundColor: statusColor(apt.pc_apptstatus || '') }}>
                              {apt.pc_apptstatus || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}

      {/* ── Patients ─────────────────────────────────────────────── */}
      {activeTab === 'patients' && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-lg-3"><KpiTile icon="bi-people" color="#0d6efd" label={t('reports.kpi.totalPatients')} value={pTotal} /></div>
            <div className="col-6 col-lg-3"><KpiTile icon="bi-person-check" color="#198754" label={t('reports.kpi.active')} value={pActive} sub={t('reports.kpi.ofTotal', { percent: pct(pActive, pTotal) })} /></div>
            <div className="col-6 col-lg-3"><KpiTile icon="bi-person-plus" color="#0dcaf0" label={t('reports.kpi.new30')} value={pNew} /></div>
            <div className="col-6 col-lg-3"><KpiTile icon="bi-calendar3" color="#6f42c1" label={t('reports.kpi.registeredThisYear')} value={pThisYear} /></div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-lg-4">
              <Panel title={t('reports.panels.bySex')} icon="bi-gender-ambiguous">
                {pSex.length === 0 && <div className="text-muted small text-center py-3">{t('reports.panels.noData')}</div>}
                {pSex.map((r, i) => (
                  <BarRow key={r.label} label={r.label} value={Number(r.count)} total={sexTotal}
                    color={['#0d6efd', '#e83e8c', '#6c757d', '#00c9a7'][i % 4]}
                    right={`${r.count} · ${pct(Number(r.count), sexTotal)}%`} />
                ))}
              </Panel>
            </div>
            <div className="col-lg-4">
              <Panel title={t('reports.panels.byAgeBand')} icon="bi-bar-chart-steps">
                {pAges.length === 0 && <div className="text-muted small text-center py-3">{t('reports.panels.noData')}</div>}
                {pAges.map((r, i) => (
                  <BarRow key={r.label} label={r.label} value={Number(r.count)} total={ageTotal}
                    color={['#0dcaf0', '#00c9a7', '#198754', '#fd7e14', '#dc3545', '#6c757d'][i % 6]}
                    right={`${r.count} · ${pct(Number(r.count), ageTotal)}%`} />
                ))}
              </Panel>
            </div>
            <div className="col-lg-4">
              <Panel title={t('reports.panels.byStatus')} icon="bi-clipboard-check">
                {pStatus.length === 0 && <div className="text-muted small text-center py-3">{t('reports.panels.noData')}</div>}
                {pStatus.map((r) => (
                  <BarRow key={r.label} label={r.label} value={Number(r.count)} total={pTotal}
                    color="#6610f2" right={`${r.count} · ${pct(Number(r.count), pTotal)}%`} />
                ))}
              </Panel>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-5">
              <Panel title={t('reports.panels.registrationTrend')} icon="bi-graph-up">
                {pMonthly.length === 0 && <div className="text-muted small text-center py-3">{t('reports.panels.noRegistrations')}</div>}
                <div className="d-flex align-items-end gap-3" style={{ height: '160px' }}>
                  {pMonthly.map((m) => (
                    <div key={m.month} className="flex-fill text-center">
                      <div className="small fw-semibold">{m.count}</div>
                      <div className="rounded-top mx-auto"
                        style={{ height: `${Math.max(6, (Number(m.count) / monthlyMax) * 110)}px`, width: '70%', background: 'linear-gradient(180deg, #0d6efd, #00c9a7)' }}></div>
                      <small className="text-muted" style={{ fontSize: '0.6rem' }}>{m.month}</small>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
            <div className="col-lg-7">
              <Panel title={t('reports.panels.recentRegistrations')} icon="bi-person-lines-fill"
                actions={<span className="badge bg-primary rounded-pill">{pRecent.length}</span>}>
                <div className="table-responsive" style={{ maxHeight: '380px' }}>
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light sticky-top">
                      <tr><th>{t('reports.cols.patient')}</th><th>{t('reports.cols.pid')}</th><th>{t('reports.cols.dob')}</th><th>{t('reports.cols.sex')}</th><th>{t('reports.cols.status')}</th><th className="text-end">{t('reports.cols.visits')}</th></tr>
                    </thead>
                    <tbody>
                      {loadingPatients ? (
                        <tr><td colSpan={6} className="text-center py-3"><div className="spinner-border spinner-border-sm"></div></td></tr>
                      ) : pRecent.length === 0 ? (
                        <tr><td colSpan={6} className="text-center text-muted py-4">{t('reports.panels.noRegistrations')}</td></tr>
                      ) : pRecent.map((p: any) => (
                        <tr key={p.patientId} style={{ cursor: 'pointer' }} onClick={() => openChart(p.patientId, p.pid)}>
                          <td className="text-nowrap fw-semibold">{p.name}</td>
                          <td>{p.pid}</td>
                          <td className="text-nowrap">{formatDateHuman(p.DOB)}</td>
                          <td>{p.sex || '—'}</td>
                          <td><span className="badge bg-light text-dark border">{p.status || '—'}</span></td>
                          <td className="text-end">{p.visits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}

      {/* ── Financial ────────────────────────────────────────────── */}
      {activeTab === 'financial' && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-lg-3"><KpiTile icon="bi-receipt" color="#0d6efd" label={t('reports.kpi.totalCharges')} value={fin ? money(fin.totalCharges) : '—'} sub={t('reports.kpi.lineItems', { count: fin?.chargeCount ?? 0 })} /></div>
            <div className="col-6 col-lg-3"><KpiTile icon="bi-cash-stack" color="#198754" label={t('reports.kpi.collected')} value={fin ? money(fin.totalPayments) : '—'} sub={t('reports.kpi.paymentsCount', { count: fin?.paymentCount ?? 0 })} /></div>
            <div className="col-6 col-lg-3"><KpiTile icon="bi-exclamation-circle" color="#dc3545" label={t('reports.kpi.outstanding')} value={fin ? money(fin.balance) : '—'} sub={t('reports.kpi.billedPatients', { count: fin?.billedPatients ?? 0 })} /></div>
            <div className="col-6 col-lg-3"><KpiTile icon="bi-percent" color="#6f42c1" label={t('reports.kpi.collectionRate')} value={`${fin?.collectionRate ?? 0}%`} sub={fin ? t('reports.kpi.avgChargeSub', { amount: money(fin.avgCharge) }) : ''} /></div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-lg-5">
              <Panel title={t('reports.panels.chargesByCategory')} icon="bi-pie-chart">
                {loadingFinancial ? (
                  <div className="text-center py-3"><div className="spinner-border spinner-border-sm"></div></div>
                ) : categories.length === 0 ? (
                  <div className="text-muted small text-center py-3">{t('reports.panels.noCharges')}</div>
                ) : categories.map((c, i) => (
                  <BarRow key={c.category} label={c.category} value={Number(c.amount)} total={Number(fin?.totalCharges) || 0}
                    color={['#0d6efd', '#198754', '#fd7e14', '#6f42c1', '#0dcaf0', '#dc3545', '#00c9a7'][i % 7]}
                    right={`${money(Number(c.amount))} · ${c.share}%`} />
                ))}
              </Panel>
            </div>
            <div className="col-lg-7">
              <Panel title={t('reports.panels.revenueSummary')} icon="bi-clipboard-data"
                actions={
                  <button className="btn btn-sm btn-primary rounded-pill" onClick={() => navigate('/billing')}>
                    <i className="bi bi-box-arrow-up-right me-1"></i>{t('reports.openBilling')}
                  </button>
                }>
                <div className="row g-2">
                  {[
                    { l: t('reports.money.charges'), v: money(fin?.totalCharges ?? 0), c: '#0d6efd' },
                    { l: t('reports.money.payments'), v: money(fin?.totalPayments ?? 0), c: '#198754' },
                    { l: t('reports.money.adjustments'), v: money(fin?.totalAdjustments ?? 0), c: '#fd7e14' },
                    { l: t('reports.money.outstanding'), v: money(fin?.balance ?? 0), c: '#dc3545' },
                    { l: t('reports.money.avgCharge'), v: money(fin?.avgCharge ?? 0), c: '#6f42c1' },
                    { l: t('reports.money.avgPayment'), v: money(fin?.avgPayment ?? 0), c: '#00c9a7' },
                  ].map((s) => (
                    <div className="col-6 col-md-4" key={s.l}>
                      <div className="p-2 rounded-3 h-100" style={{ backgroundColor: `${s.c}10` }}>
                        <div className="text-muted text-uppercase" style={{ fontSize: '0.6rem' }}>{s.l}</div>
                        <div className="fw-bold" style={{ color: s.c }}>{s.v}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <hr />

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-muted">{t('reports.money.collectionRate')}</span>
                  <span className="fw-bold">{fin?.collectionRate ?? 0}%</span>
                </div>
                <div className="progress" style={{ height: '10px' }}>
                  <div className="progress-bar bg-success" style={{ width: `${Math.min(100, fin?.collectionRate ?? 0)}%` }}></div>
                </div>

                {(fin?.pendingHolds ?? 0) > 0 && (
                  <div className="alert alert-warning py-2 small mt-3 mb-0">
                    <i className="bi bi-lock-fill me-1"></i>
                    {t('reports.billingHolds', { count: fin.pendingHolds })}
                    {fin.heldAmount ? ' ' + t('reports.heldAmount', { amount: money(fin.heldAmount) }) : ''}
                  </div>
                )}
                <div className="text-muted small mt-3">
                  {t('reports.totalsLine', { encounters: fin?.encounterCount ?? 0, lines: fin?.chargeCount ?? 0, payments: fin?.paymentCount ?? 0 })}
                </div>
              </Panel>
            </div>
          </div>

          <Panel title={t('reports.panels.outstandingBalances')} icon="bi-person-exclamation"
            actions={
              <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => navigate('/billing/medical')}>
                <i className="bi bi-cash-coin me-1"></i>{t('reports.takePayment')}
              </button>
            }>
            <div className="table-responsive" style={{ maxHeight: '360px' }}>
              <table className="table table-sm table-hover align-middle mb-0">
                <thead className="table-light sticky-top">
                  <tr><th>{t('reports.cols.patient')}</th><th>{t('reports.cols.pid')}</th><th className="text-end">{t('reports.cols.charges')}</th><th className="text-end">{t('reports.cols.paid')}</th><th className="text-end">{t('reports.cols.balance')}</th></tr>
                </thead>
                <tbody>
                  {loadingFinancial ? (
                    <tr><td colSpan={5} className="text-center py-3"><div className="spinner-border spinner-border-sm"></div></td></tr>
                  ) : outstanding.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted py-4">{t('reports.nothingOutstanding')}</td></tr>
                  ) : outstanding.map((o: any) => (
                    <tr key={o.pid} style={{ cursor: 'pointer' }} onClick={() => openChart(o.patientId, o.pid)}>
                      <td className="fw-semibold">{o.patientName}</td>
                      <td>{o.pid}</td>
                      <td className="text-end">{money(o.charges)}</td>
                      <td className="text-end text-success">{money(o.paid)}</td>
                      <td className="text-end fw-bold text-danger">{money(o.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}


