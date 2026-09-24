import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import nestClient from '../../api/nest-client';
import RecentApprovalsPanel from '../../components/shared/RecentApprovalsPanel';
import { formatPatientName } from '../../utils/patientName';

/** Standard pregnancy risk scoring algorithm (modified Bishop/PARs) */
function computeRiskScore(
  age: number, parity: number, gestationWeeks: number,
  bpSystolic: number, bpDiastolic: number, hemoglobin: number,
  hasDiabetes: boolean, hasPreeclampsia: boolean,
): { score: number; level: 'low' | 'moderate' | 'high'; color: string; label: string } {
  let score = 0;

  // Age risk
  if (age < 18) score += 2;
  else if (age > 35) score += 3;
  else if (age > 40) score += 5;

  // Parity risk
  if (parity === 0) score += 1;
  else if (parity > 4) score += 2;

  // Gestation risk
  if (gestationWeeks < 28) score += 3;
  else if (gestationWeeks > 40) score += 2;

  // Blood pressure (standard ACOG thresholds)
  if (bpSystolic >= 160 || bpDiastolic >= 110) score += 5;
  else if (bpSystolic >= 140 || bpDiastolic >= 90) score += 3;
  else if (bpSystolic >= 130 || bpDiastolic >= 85) score += 1;

  // Anemia
  if (hemoglobin < 7) score += 4;
  else if (hemoglobin < 10) score += 2;
  else if (hemoglobin < 11) score += 1;

  // Comorbidities
  if (hasDiabetes) score += 3;
  if (hasPreeclampsia) score += 5;

  if (score <= 3) return { score, level: 'low', color: '#198754', label: 'Low Risk' };
  if (score <= 7) return { score, level: 'moderate', color: '#fd7e14', label: 'Moderate Risk' };
  return { score, level: 'high', color: '#dc3545', label: 'High Risk' };
}

/** EDD calculator using Naegele's Rule */
function calculateEDD(lmpDate: string): { edd: string; gestationWeeks: number; gestationDays: number } {
  const lmp = new Date(lmpDate);
  const edd = new Date(lmp);
  edd.setDate(edd.getDate() + 280); // Naegele's: LMP + 280 days
  const now = new Date();
  const diffMs = now.getTime() - lmp.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;
  return {
    edd: edd.toISOString().split('T')[0],
    gestationWeeks: weeks,
    gestationDays: days,
  };
}

/** APGAR score interpretation */
function interpretApgar(total: number): { color: string; interpretation: string } {
  if (total >= 7) return { color: '#198754', interpretation: 'Normal' };
  if (total >= 4) return { color: '#fd7e14', interpretation: 'Moderately Depressed' };
  return { color: '#dc3545', interpretation: 'Severely Depressed — Needs Resuscitation' };
}

function LiveClock({ timezone, label }: { timezone: string; label: string }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="text-center px-3">
      <div className="text-white text-opacity-75" style={{ fontSize: '0.7rem' }}>{label}</div>
      <div className="fw-bold" style={{ fontSize: '1.1rem', fontVariantNumeric: 'tabular-nums' }}>
        {time.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </div>
    </div>
  );
}

export default function MidwifeDashboardPage() {
  const { user } = useAuth();
  const [lmpInput, setLmpInput] = useState('');
  const [eddResult, setEddResult] = useState<ReturnType<typeof calculateEDD> | null>(null);
  const [riskForm, setRiskForm] = useState({
    age: '28', parity: '1', gestationWeeks: '30',
    bpSystolic: '120', bpDiastolic: '80', hemoglobin: '12',
    hasDiabetes: false, hasPreeclampsia: false,
  });
  const [riskResult, setRiskResult] = useState<ReturnType<typeof computeRiskScore> | null>(null);
  const [apgarScores, setApgarScores] = useState({ appearance: '2', pulse: '2', grimace: '2', activity: '2', respiration: '2' });
  const [apgarTotal, setApgarTotal] = useState(10);

  const { data: maternalPatients = [] } = useQuery({
    queryKey: ['maternal-patients'],
    queryFn: async () => {
      const r = await nestClient.get('/patients', { params: { sex: 'Female', ageMin: 12, ageMax: 55 } });
      return r.data;
    },
    refetchInterval: 30000,
  });

  // All scheduled deliveries for the current month — single shared queue
  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries-month'],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const r = await nestClient.get('/appointments', {
        params: { startDate: fmt(firstDay), endDate: fmt(lastDay), category: 'Delivery' },
      });
      return r.data;
    },
    refetchInterval: 30000,
  });

  const handleEddCalc = () => {
    if (!lmpInput) return;
    setEddResult(calculateEDD(lmpInput));
  };

  const handleRiskCalc = () => {
    const result = computeRiskScore(
      Number(riskForm.age), Number(riskForm.parity), Number(riskForm.gestationWeeks),
      Number(riskForm.bpSystolic), Number(riskForm.bpDiastolic), Number(riskForm.hemoglobin),
      riskForm.hasDiabetes, riskForm.hasPreeclampsia,
    );
    setRiskResult(result);
  };

  const updateApgar = (field: string, value: string) => {
    const updated = { ...apgarScores, [field]: value };
    setApgarScores(updated);
    const total = Object.values(updated).reduce((s, v) => s + Number(v), 0);
    setApgarTotal(total);
  };

  const apgarInterpretation = interpretApgar(apgarTotal);

  const maternalCount = maternalPatients.length;
  const activeLabor = deliveries.filter((d: any) => d.pc_apptstatus === 'Checked In').length;
  const monthlyDeliveries = deliveries.length;

  return (
    <div>
      {/* Header */}
      <div className="rounded-4 p-4 mb-4 text-white" style={{
        background: 'linear-gradient(135deg, #e83e8c 0%, #d63384 50%, #6f42c1 100%)',
      }}>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h2 className="mb-1 fw-bold">
              <i className="bi bi-heart-fill me-2"></i>
              Midwife Dashboard
            </h2>
            <p className="mb-0 text-white text-opacity-75 small">
              Welcome, {user?.displayName || 'Midwife'} — Maternal Care & Delivery Management
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <LiveClock timezone="Africa/Monrovia" label="Monrovia" />
            <div className="vr opacity-50"></div>
            <LiveClock timezone="America/New_York" label="Florida (US)" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px', backgroundColor: '#e83e8c20' }}>
                <i className="bi bi-people-fill fs-5" style={{ color: '#e83e8c' }}></i>
              </div>
              <div>
                <div className="text-muted small">Maternal Patients</div>
                <div className="fw-bold fs-5">{maternalCount}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px', backgroundColor: '#fd7e1420' }}>
                <i className="bi bi-hourglass-split fs-5" style={{ color: '#fd7e14' }}></i>
              </div>
              <div>
                <div className="text-muted small">Active Labor</div>
                <div className="fw-bold fs-5">{activeLabor}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px', backgroundColor: '#19875420' }}>
                <i className="bi bi-check-circle fs-5" style={{ color: '#198754' }}></i>
              </div>
              <div>
                <div className="text-muted small">Deliveries This Month</div>
                <div className="fw-bold fs-5">{monthlyDeliveries}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Left Column — EDD Calculator & Risk Assessment */}
        <div className="col-lg-6">
          {/* EDD Calculator */}
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-header bg-white py-3 rounded-top-4">
              <h6 className="mb-0 fw-bold">
                <i className="bi bi-calendar-check me-2" style={{ color: '#e83e8c' }}></i>
                EDD Calculator — Naegele's Rule
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-2 align-items-end">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Last Menstrual Period (LMP)</label>
                  <input type="date" className="form-control" value={lmpInput}
                    onChange={e => setLmpInput(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <button className="btn btn-pink w-100" style={{ backgroundColor: '#e83e8c', color: '#fff' }}
                    onClick={handleEddCalc}>
                    <i className="bi bi-calculator me-1"></i>Calculate
                  </button>
                </div>
                <div className="col-md-3"></div>
              </div>
              {eddResult && (
                <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="row text-center">
                    <div className="col-4">
                      <div className="text-muted small">Estimated Due Date</div>
                      <div className="fw-bold fs-5" style={{ color: '#e83e8c' }}>{eddResult.edd}</div>
                    </div>
                    <div className="col-4">
                      <div className="text-muted small">Gestational Age</div>
                      <div className="fw-bold fs-5">{eddResult.gestationWeeks}w {eddResult.gestationDays}d</div>
                    </div>
                    <div className="col-4">
                      <div className="text-muted small">Trimester</div>
                      <div className="fw-bold fs-5">
                        {eddResult.gestationWeeks < 13 ? '1st' : eddResult.gestationWeeks < 27 ? '2nd' : '3rd'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-header bg-white py-3 rounded-top-4">
              <h6 className="mb-0 fw-bold">
                <i className="bi bi-shield-exclamation me-2" style={{ color: '#fd7e14' }}></i>
                Pregnancy Risk Assessment (PARs Algorithm)
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-4">
                  <label className="form-label small fw-semibold">Age</label>
                  <input type="number" className="form-control form-control-sm" value={riskForm.age}
                    onChange={e => setRiskForm(p => ({ ...p, age: e.target.value }))} />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Parity</label>
                  <input type="number" className="form-control form-control-sm" value={riskForm.parity}
                    onChange={e => setRiskForm(p => ({ ...p, parity: e.target.value }))} />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Gest. Weeks</label>
                  <input type="number" className="form-control form-control-sm" value={riskForm.gestationWeeks}
                    onChange={e => setRiskForm(p => ({ ...p, gestationWeeks: e.target.value }))} />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">BP Systolic</label>
                  <input type="number" className="form-control form-control-sm" value={riskForm.bpSystolic}
                    onChange={e => setRiskForm(p => ({ ...p, bpSystolic: e.target.value }))} />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">BP Diastolic</label>
                  <input type="number" className="form-control form-control-sm" value={riskForm.bpDiastolic}
                    onChange={e => setRiskForm(p => ({ ...p, bpDiastolic: e.target.value }))} />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Hb (g/dL)</label>
                  <input type="number" step="0.1" className="form-control form-control-sm" value={riskForm.hemoglobin}
                    onChange={e => setRiskForm(p => ({ ...p, hemoglobin: e.target.value }))} />
                </div>
                <div className="col-6">
                  <div className="form-check mt-4">
                    <input className="form-check-input" type="checkbox" checked={riskForm.hasDiabetes}
                      onChange={e => setRiskForm(p => ({ ...p, hasDiabetes: e.target.checked }))} id="chkDiabetes" />
                    <label className="form-check-label small" htmlFor="chkDiabetes">Gestational Diabetes</label>
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-check mt-4">
                    <input className="form-check-input" type="checkbox" checked={riskForm.hasPreeclampsia}
                      onChange={e => setRiskForm(p => ({ ...p, hasPreeclampsia: e.target.checked }))} id="chkPreeclampsia" />
                    <label className="form-check-label small" htmlFor="chkPreeclampsia">Pre-eclampsia</label>
                  </div>
                </div>
              </div>
              <button className="btn btn-warning btn-sm mt-3" onClick={handleRiskCalc}>
                <i className="bi bi-calculator me-1"></i>Assess Risk
              </button>
              {riskResult && (
                <div className="mt-3 p-3 rounded-3 d-flex align-items-center gap-3"
                  style={{ backgroundColor: riskResult.color + '15', borderLeft: `4px solid ${riskResult.color}` }}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                    style={{ width: '48px', height: '48px', backgroundColor: riskResult.color, fontSize: '1.2rem' }}>
                    {riskResult.score}
                  </div>
                  <div>
                    <div className="fw-bold" style={{ color: riskResult.color }}>{riskResult.label}</div>
                    <div className="text-muted small">PARs Score: {riskResult.score} / 20+</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column — APGAR & Active Labor */}
        <div className="col-lg-6">
          {/* APGAR Calculator */}
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-header bg-white py-3 rounded-top-4">
              <h6 className="mb-0 fw-bold">
                <i className="bi bi-clipboard2-pulse me-2" style={{ color: '#0dcaf0' }}></i>
                APGAR Score — Newborn Assessment
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-2">
                {[
                  { key: 'appearance', label: 'Appearance (Color)', icon: 'bi-palette' },
                  { key: 'pulse', label: 'Pulse (Heart Rate)', icon: 'bi-heart-pulse' },
                  { key: 'grimace', label: 'Grimace (Reflex)', icon: 'bi-emoji-expressionless' },
                  { key: 'activity', label: 'Activity (Tone)', icon: 'bi-person-arms-up' },
                  { key: 'respiration', label: 'Respiration', icon: 'bi-lungs' },
                ].map(item => (
                  <div className="col-md-6 mb-2" key={item.key}>
                    <label className="form-label small fw-semibold">
                      <i className={`${item.icon} me-1`}></i>{item.label}
                    </label>
                    <select className="form-select form-select-sm"
                      value={(apgarScores as any)[item.key]}
                      onChange={e => updateApgar(item.key, e.target.value)}>
                      <option value="0">0 — Absent</option>
                      <option value="1">1 — Weak / Some</option>
                      <option value="2">2 — Strong / Active</option>
                    </select>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-3 d-flex align-items-center gap-3"
                style={{ backgroundColor: apgarInterpretation.color + '15', borderLeft: `4px solid ${apgarInterpretation.color}` }}>
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                  style={{ width: '56px', height: '56px', backgroundColor: apgarInterpretation.color, fontSize: '1.5rem' }}>
                  {apgarTotal}
                </div>
                <div>
                  <div className="fw-bold" style={{ color: apgarInterpretation.color }}>
                    APGAR: {apgarInterpretation.interpretation}
                  </div>
                  <div className="text-muted small">Score at 1 minute & 5 minutes after birth</div>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduled Deliveries — current month */}
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white py-3 rounded-top-4 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">
                <i className="bi bi-clipboard-heart me-2" style={{ color: '#e83e8c' }}></i>
                Deliveries This Month
              </h6>
              <span className="badge rounded-pill" style={{ backgroundColor: '#e83e8c' }}>
                {deliveries.length} scheduled
              </span>
            </div>
            <div className="card-body p-0">
              {deliveries.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <i className="bi bi-calendar-x fs-3 d-block mb-2"></i>
                  No deliveries scheduled this month
                </div>
              ) : (
                <div className="list-group list-group-flush" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {deliveries.map((d: any, i: number) => (
                    <div key={i} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="fw-semibold small">{formatPatientName(d)}</div>
                        <span className={`badge rounded-pill ${
                          d.pc_apptstatus === 'Checked In' ? 'bg-warning text-dark' :
                          d.pc_apptstatus === 'Checked Out' ? 'bg-success' :
                          d.pc_apptstatus === 'Pending' ? 'bg-secondary' :
                          d.pc_apptstatus === 'Scheduled' ? 'bg-info' : 'bg-secondary'
                        }`}>
                          {d.pc_apptstatus || 'Scheduled'}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
                        <span><i className="bi bi-calendar-event me-1"></i>{d.eventDateStr || '—'}</span>
                        <span><i className="bi bi-clock me-1"></i>{d.pc_startTime || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shared: Recently Approved Patients — propagates from registrar */}
      <div className="mt-4">
        <RecentApprovalsPanel />
      </div>
    </div>
  );
}
