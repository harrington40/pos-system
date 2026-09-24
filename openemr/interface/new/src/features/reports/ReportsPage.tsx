import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAppointments } from '../../api/endpoints/appointments';
import nestClient from '../../api/nest-client';
import { useCurrency } from '../../hooks/useCurrency';
import { formatMoney } from '../../utils/currency';
import CurrencySwitcher from '../../components/shared/CurrencySwitcher';

type ReportTab = 'appointments' | 'patients' | 'financial';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('appointments');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['reports', 'appointments', dateFrom, dateTo],
    queryFn: () => getAppointments({ startDate: dateFrom, endDate: dateTo }),
    enabled: activeTab === 'appointments',
  });

  const { data: financialReport } = useQuery({
    queryKey: ['reports', 'financial'],
    queryFn: async () => { const r = await nestClient.get('/billing/financial-report'); return r.data; },
    enabled: activeTab === 'financial',
  });

  const { currency, exchangeRate } = useCurrency();

  // Calculate stats
  const totalAppointments = appointments.length;
  const statusCounts = appointments.reduce<Record<string, number>>((acc, apt) => {
    const status = apt.pc_apptstatus || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const uniquePatients = new Set(appointments.map((a) => a.pc_pid)).size;

  return (
    <div className="glass-page position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #f5faff 45%, #d1fae5 100%)', borderRadius: '20px', minHeight: '100vh', padding: '16px' }}>
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
      <h3 className="mb-4">
        <i className="bi bi-graph-up me-2"></i>
        Reports
      </h3>

      {/* Date range filter */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-end g-2">
            <div className="col-auto">
              <label className="form-label small">From</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small">To</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <i className="bi bi-calendar-check me-1"></i>
            Appointment Report
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            <i className="bi bi-people me-1"></i>
            Patient Report
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'financial' ? 'active' : ''}`}
            onClick={() => setActiveTab('financial')}
          >
            <i className="bi bi-cash-stack me-1"></i>
            Financial Report
          </button>
        </li>
      </ul>

      {activeTab === 'appointments' && (
        <>
          {/* Summary cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card text-bg-primary">
                <div className="card-body">
                  <div className="small">Total Appointments</div>
                  <div className="display-6">{totalAppointments}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-bg-success">
                <div className="card-body">
                  <div className="small">Unique Patients</div>
                  <div className="display-6">{uniquePatients}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-bg-info">
                <div className="card-body">
                  <div className="small">Period (days)</div>
                  <div className="display-6">
                    {Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-bg-warning">
                <div className="card-body">
                  <div className="small">Avg per Day</div>
                  <div className="display-6">
                    {Math.round(totalAppointments / Math.max(1, Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1) * 10) / 10}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Status Breakdown</h5>
            </div>
            <div className="card-body">
              <div className="row">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div className="col-md-4 mb-2" key={status}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span>{status || 'Unknown'}</span>
                      <span className="badge bg-primary rounded-pill">{count}</span>
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                      <div
                        className="progress-bar"
                        style={{ width: `${(count / totalAppointments) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Appointment list */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Appointment Details</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '500px' }}>
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Title</th>
                      <th>Provider</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={6} className="text-center p-3"><div className="spinner-border spinner-border-sm" role="status"></div></td></tr>
                    ) : (
                      appointments.map((apt) => (
                        <tr key={apt.pc_eid}>
                          <td>{apt.pc_eventDate}</td>
                          <td>{apt.pc_startTime?.substring(0, 5)}</td>
                          <td>{apt.lname}, {apt.fname}</td>
                          <td>{apt.pc_title}</td>
                          <td>{apt.pce_aid_fname} {apt.pce_aid_lname || apt.pc_aid || '—'}</td>
                          <td><span className="badge bg-secondary">{apt.pc_apptstatus || '—'}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'patients' && (
        <div className="card">
          <div className="card-body text-center text-muted p-5">
            <i className="bi bi-people" style={{ fontSize: '3rem' }}></i>
            <p className="mt-3">
              Detailed patient reporting coming soon.
            </p>
            <p>
              For now, use the{' '}
              <a href="/interface/reports/patient_list.php" target="_blank" rel="noreferrer">
                legacy patient report
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-cash-stack me-2"></i>System-wide Financial Report</h5>
            <CurrencySwitcher />
          </div>
          <div className="card-body">
            {financialReport ? (
              <>
                <div className="row g-3 mb-4">
                  {[
                    { label: 'Total Charges', value: financialReport.totalCharges, color: '#0d6efd', icon: 'bi-receipt' },
                    { label: 'Total Payments', value: financialReport.totalPayments, color: '#198754', icon: 'bi-cash-stack' },
                    { label: 'Outstanding', value: financialReport.balance, color: '#dc3545', icon: 'bi-exclamation-circle' },
                    { label: 'Billed Patients', value: financialReport.billedPatients, color: '#6f42c1', icon: 'bi-people' },
                  ].map((k, i) => (
                    <div className="col-md-3" key={i}>
                      <div className="card h-100" style={{ borderRadius: '16px', borderLeft: `4px solid ${k.color}` }}>
                        <div className="card-body">
                          <div className="text-muted small"><i className={`bi ${k.icon} me-1`}></i>{k.label}</div>
                          <div className="fs-4 fw-bold">{k.label === 'Billed Patients' ? k.value : formatMoney(k.value, currency, exchangeRate)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card mb-3">
                  <div className="card-header"><h6 className="mb-0">Charges by Category</h6></div>
                  <div className="card-body p-0">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light"><tr><th>Category</th><th>Count</th><th className="text-end">Amount</th></tr></thead>
                      <tbody>
                        {financialReport.byCategory.map((c: any) => (
                          <tr key={c.category}><td className="text-capitalize">{c.category}</td><td>{c.count}</td><td className="text-end">{formatMoney(c.amount, currency, exchangeRate)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="text-muted small">
                  Encounters: {financialReport.encounterCount} · Charge line items: {financialReport.chargeCount} · Payments: {financialReport.paymentCount}
                </div>
              </>
            ) : (
              <div className="text-center py-4"><div className="spinner-border spinner-border-sm"></div></div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
