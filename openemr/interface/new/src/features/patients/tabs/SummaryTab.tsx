import type { Patient } from '../../../types/patient';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import nestClient from '../../../api/nest-client';
import { formatVital, formatVitalUnit, formatBP, classifyBP, classifyPulse, classifyTemp, classifyResp, classifySpO2 } from '../../../utils/vitalsClassify';
import { formatPatientName } from '../../../utils/patientName';
import { formatDateOnly, formatDateHuman } from '../../../utils/date';

interface Props {
  patient: Patient;
  patientId: string;
  patientName: string;
  allergies: any[];
  allergiesEnriched?: any[];
  medications: any[];
  conditions: any[];
  vitals: any[];
  notes?: any[];
  labOrders?: any[];
  labResults?: any[];
  onViewTrend: () => void;
}

const ROS_SYSTEMS: { key: string; labelKey: string; words: string[] }[] = [
  { key: 'constitutional', labelKey: 'rosConstitutional', words: ['fever', 'fatigue', 'chills', 'weight'] },
  { key: 'respiratory', labelKey: 'rosRespiratory', words: ['cough', 'shortness of breath', 'dyspnea', 'wheeze'] },
  { key: 'cardiovascular', labelKey: 'rosCardiovascular', words: ['chest pain', 'palpitations', 'edema'] },
  { key: 'gi', labelKey: 'rosGi', words: ['nausea', 'vomiting', 'abdominal', 'diarrhea'] },
  { key: 'gu', labelKey: 'rosGu', words: ['dysuria', 'urinary', 'hematuria'] },
  { key: 'neuro', labelKey: 'rosNeuro', words: ['headache', 'dizziness', 'numbness', 'weakness'] },
  { key: 'msk', labelKey: 'rosMsk', words: ['joint', 'back pain', 'muscle'] },
  { key: 'skin', labelKey: 'rosSkin', words: ['rash', 'lesion', 'itching'] },
  { key: 'psych', labelKey: 'rosPsych', words: ['anxiety', 'depression', 'mood'] },
  { key: 'heent', labelKey: 'rosHeent', words: ['sore throat', 'ear pain', 'vision'] },
];

export default function SummaryTab({
  patient,
  patientId,
  patientName,
  allergies = [],
  allergiesEnriched = [],
  medications = [],
  conditions = [],
  vitals = [],
  notes = [],
  labOrders = [],
  labResults = [],
  onViewTrend,
}: Props) {
  const { t } = useTranslation();
  const p = patient as any;
  const dobRaw = p.DOB || p.dob;
  const age = dobRaw
    ? Math.floor((Date.now() - new Date(dobRaw).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const phone = p.phone_contact || p.phone || '—';
  const attending = p.providerName || p.provider_name || '—';
  const codeStatus = p.code_status || 'Full Code';

  const { data: attendingHistory = [] } = useQuery({
    queryKey: ['attending-history', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      try { const r = await nestClient.get(`/patients/${patientId}/attending-history`); return r.data || []; } catch { return []; }
    },
    enabled: !!patientId,
  });

  const latest = vitals?.[0];
  const prev = vitals?.[1];
  const latestNote = notes?.[0];

  // Fall back to the most recent reading that actually contains each value,
  // since a single vitals entry may not capture weight/height.
  const pickVital = (key: string) => (vitals || []).find((v: any) => v?.[key] != null && v?.[key] !== '')?.[key];
  const weight = formatVital(pickVital('weight'), 1);
  const height = formatVital(pickVital('height'), 1);
  const bmi = formatVital(pickVital('BMI'), 1);
  const bmiVal = Number(pickVital('BMI'));
  const bmiColor = !isFinite(bmiVal) || bmiVal === 0 ? '#6c757d' : (bmiVal < 18.5 || bmiVal >= 30 ? '#dc3545' : bmiVal >= 25 ? '#fd7e14' : '#198754');
  const bpText = latest ? formatBP(latest.bps, latest.bpd) : '—';
  const pulseText = formatVital(latest?.pulse);
  const tempText = latest?.temperature ? `${formatVital(latest.temperature, 1)} °C` : '—';
  const respText = formatVital(latest?.respiration);
  const spo2Text = latest?.oxygen_saturation ? `${formatVital(latest.oxygen_saturation)}%` : '—';

  // ── Needs Attention flags ─────────────────────────────────────────
  const flags: { icon: string; color: string; text: string }[] = [];
  const bpHigh = latest && (Number(latest.bps) >= 140 || Number(latest.bpd) >= 90);
  if (bpHigh) flags.push({ icon: 'bi-heart-pulse', color: 'danger', text: t('patients.tabs.summary.flagElevatedBp', { bp: formatBP(latest.bps, latest.bpd) }) });
  if (latest && Number(latest.oxygen_saturation) > 0 && Number(latest.oxygen_saturation) < 94) {
    flags.push({ icon: 'bi-lungs', color: 'danger', text: t('patients.tabs.summary.flagLowSpo2', { spo2: formatVital(latest.oxygen_saturation) }) });
  }
  const allergySource = (allergiesEnriched && allergiesEnriched.length) ? allergiesEnriched : allergies;
  const allergyNames = allergySource.map((a: any) => String(a.allergen || a.title || '').toLowerCase()).filter(Boolean);
  const drugAllergy = medications.filter((m: any) => {
    const d = String(m.drug || '').toLowerCase();
    return allergyNames.some((a) => d.includes(a));
  });
  drugAllergy.forEach((m: any) => flags.push({ icon: 'bi-capsule', color: 'danger', text: t('patients.tabs.summary.flagDrugAllergy', { drug: m.drug }) }));
  if (medications.length >= 5) flags.push({ icon: 'bi-capsule-pill', color: 'warning', text: t('patients.tabs.summary.flagPolypharmacy', { count: medications.length }) });

  // ── Smart clinical summary ────────────────────────────────────────
  const insights: string[] = [];
  if (latest && prev && Number(latest.bps) > Number(prev.bps)) insights.push(t('patients.tabs.summary.insightBpUp'));
  if (allergyNames.length && drugAllergy.length === 0) insights.push(t('patients.tabs.summary.insightNoConflicts'));
  insights.push(t('patients.tabs.summary.insightCounts', { meds: medications.length, allergies: allergies.length, diagnoses: conditions.length }));

  // ── ROS detection from notes ──────────────────────────────────────
  const noteText = notes.map((n: any) => `${n.title || ''} ${n.body || ''}`).join(' ').toLowerCase();
  const conditionText = conditions.map((c: any) => c.title || c.name || c.diagnosis || '').join(' ').toLowerCase();
  const haystack = `${noteText} ${conditionText}`;

  return (
    <div className="medical-record">
      {/* Facility header */}
      <div className="text-center mb-3">
        <h5 className="fw-bold mb-0">{t('patients.tabs.summary.facility')}</h5>
        <div className="text-uppercase fw-bold" style={{ letterSpacing: '1px', fontSize: '0.8rem' }}>{t('patients.tabs.summary.recordTitle')}</div>
        <small className="text-muted">{t('patients.tabs.summary.confidential')}</small>
      </div>

      {/* Demographics banner */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '16px', borderLeft: '4px solid #0d6efd' }}>
        <div className="card-body py-3">
          <div className="row g-2 small">
            <div className="col-md-6">
              <div className="fw-bold fs-6">{patientName || formatPatientName(patient)}</div>
              <div className="text-muted">{t('patients.tabs.summary.dobLabel')} {formatDateOnly(dobRaw)} {age != null ? t('patients.tabs.summary.age', { count: age }) : ''} · {patient.sex || '—'}</div>
              <div className="text-muted">{t('patients.tabs.summary.pidChart', { pid: patient.pid ?? '—', chart: patient.public_id || '—' })}</div>
            </div>
            <div className="col-md-6">
              <div><span className="text-muted">{t('patients.tabs.summary.attending')}</span> {attending}</div>
              <div><span className="text-muted">{t('patients.tabs.summary.phone')}</span> {phone}</div>
              <div><span className="text-muted">{t('patients.tabs.summary.codeStatus')}</span> {codeStatus}</div>
            </div>
          </div>
          <div className="row g-2 small mt-2 border-top pt-2">
            <div className="col-6 col-md-3"><span className="text-muted d-block">{t('patients.tabs.summary.bloodPressure')}</span><b style={{ color: latest ? classifyBP(latest.bps, latest.bpd).color : undefined }}>{bpText}</b></div>
            <div className="col-6 col-md-2"><span className="text-muted d-block">{t('patients.tabs.summary.pulse')}</span><b style={{ color: latest ? classifyPulse(latest.pulse).color : undefined }}>{pulseText}</b></div>
            <div className="col-6 col-md-2"><span className="text-muted d-block">{t('patients.tabs.summary.temp')}</span><b style={{ color: latest ? classifyTemp(latest.temperature).color : undefined }}>{tempText}</b></div>
            <div className="col-6 col-md-2"><span className="text-muted d-block">{t('patients.tabs.summary.resp')}</span><b style={{ color: latest ? classifyResp(latest.respiration).color : undefined }}>{respText}</b></div>
            <div className="col-6 col-md-3"><span className="text-muted d-block">{t('patients.tabs.summary.spo2')}</span><b style={{ color: latest ? classifySpO2(latest.oxygen_saturation).color : undefined }}>{spo2Text}</b></div>
          </div>
          <div className="row g-2 small mt-2 border-top pt-2">
            <div className="col-4 col-md-3"><span className="text-muted d-block">{t('patients.tabs.summary.weight')}</span><b style={{ color: '#198754' }}>{weight} kg</b></div>
            <div className="col-4 col-md-3"><span className="text-muted d-block">{t('patients.tabs.summary.height')}</span><b style={{ color: '#0d6efd' }}>{height} cm</b></div>
            <div className="col-4 col-md-3"><span className="text-muted d-block">{t('patients.tabs.summary.bmi')}</span><b style={{ color: bmiColor }}>{bmi}</b></div>
            <div className="col-12 col-md-3">
              <span className="text-muted d-block">{t('patients.tabs.summary.allergies')}</span>
              {allergySource.length ? (
                allergySource.map((a: any, i: number) => (
                  <span key={i} className="badge bg-danger bg-opacity-10 text-danger me-1" title={a.source && a.source !== 'recorded' ? t('patients.tabs.summary.populationSource', { source: a.source }) : undefined}>
                    {a.allergen || a.title}
                    {a.source && a.source !== 'recorded' && <i className={`bi ms-1 ${a.source === 'note' ? 'bi-journal-text' : 'bi-capsule'}`}></i>}
                  </span>
                ))
              ) : (
                <b className="text-muted">{t('patients.tabs.summary.noKnownAllergies')}</b>
              )}
            </div>
          </div>
          {attendingHistory.length > 0 && (
            <div className="mt-2 border-top pt-2">
              <div className="text-muted small mb-1"><i className="bi bi-clock-history me-1"></i>{t('patients.tabs.summary.attendingHistory')}</div>
              <div className="d-flex flex-wrap gap-2">
                {(attendingHistory as any[]).map((a: any, i: number) => (
                  <span key={i} className="badge bg-light text-dark border" style={{ fontWeight: 500 }}>
                    {a.name}{a.role ? ` · ${a.role}` : ''}{a.last_seen ? ` · ${formatDateHuman(a.last_seen)}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Needs attention */}
      {flags.length > 0 && (
        <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '16px', borderLeft: '4px solid #dc3545' }}>
          <div className="card-body py-2 px-3">
            <div className="fw-bold small mb-1"><i className="bi bi-exclamation-triangle text-danger me-1"></i>{t('patients.tabs.summary.needsAttention')}</div>
            {flags.map((f, i) => (
              <div key={i} className="small mb-1"><i className={`bi ${f.icon} text-${f.color} me-1`}></i>{f.text}</div>
            ))}
          </div>
        </div>
      )}

      {/* Chief complaint + HPI */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white py-2"><h6 className="mb-0 fw-bold"><i className="bi bi-chat-left-text me-2 text-primary"></i>{t('patients.tabs.summary.chiefComplaint')}</h6></div>
        <div className="card-body py-2 small">
          <div className="fw-semibold mb-1">{latestNote?.title || '—'}</div>
          <div className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>{(latestNote?.body || t('patients.tabs.summary.noNarrative')).slice(0, 500)}</div>
        </div>
      </div>

      {/* Smart clinical summary */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '16px', borderLeft: '4px solid #6f42c1' }}>
        <div className="card-header bg-white py-2"><h6 className="mb-0 fw-bold"><i className="bi bi-stars me-2 text-primary"></i>{t('patients.tabs.summary.smartSummary')}</h6></div>
        <div className="card-body py-2">
          <ul className="mb-0 small ps-3">
            {insights.map((s, i) => <li key={i} className="mb-1">{s}</li>)}
          </ul>
        </div>
      </div>

      {/* Clinical history grid */}
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
            <div className="card-header bg-white py-2"><h6 className="mb-0 fw-bold"><i className="bi bi-clipboard2-pulse me-2 text-info"></i>{t('patients.tabs.summary.pastMedical')}</h6></div>
            <div className="card-body py-2">
              {conditions.length ? conditions.map((c: any, i: number) => (
                <div key={i} className="small mb-1">• {c.title || c.name || c.diagnosis || c.code || '—'}</div>
              )) : <div className="small text-muted">{t('patients.tabs.summary.noDiagnoses')}</div>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
            <div className="card-header bg-white py-2"><h6 className="mb-0 fw-bold"><i className="bi bi-scissors me-2 text-secondary"></i>{t('patients.tabs.summary.pastSurgical')}</h6></div>
            <div className="card-body py-2 small">
              <div className="mb-2"><span className="text-muted">{t('patients.tabs.summary.surgical')}</span> {latestNote ? '—' : '—'}</div>
              <div className="mb-2"><span className="text-muted">{t('patients.tabs.summary.social')}</span> —</div>
              <div><span className="text-muted">{t('patients.tabs.summary.family')}</span> —</div>
            </div>
          </div>
        </div>
      </div>

      {/* Review of systems */}
      <div className="card border-0 shadow-sm mt-3" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white py-2"><h6 className="mb-0 fw-bold"><i className="bi bi-list-check me-2 text-success"></i>{t('patients.tabs.summary.reviewOfSystems')}</h6></div>
        <div className="card-body py-2">
          <div className="d-flex flex-wrap gap-2">
            {ROS_SYSTEMS.map((sys) => {
              const positive = sys.words.some((w) => haystack.includes(w));
              return (
                <span key={sys.key} className={`badge ${positive ? 'bg-warning bg-opacity-15 text-dark' : 'bg-light text-muted'} border`} style={{ fontSize: '0.72rem' }}>
                  {positive ? '+' : '−'} {t(`patients.tabs.summary.${sys.labelKey}`)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Medications */}
      <div className="card border-0 shadow-sm mt-3" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white py-2"><h6 className="mb-0 fw-bold"><i className="bi bi-capsule me-2 text-primary"></i>{t('patients.tabs.summary.currentMeds')}</h6></div>
        <div className="card-body p-0">
          {medications.length ? (
            <table className="table table-sm small mb-0">
              <thead className="table-light"><tr><th>{t('patients.tabs.summary.thMedication')}</th><th>{t('patients.tabs.summary.thDose')}</th><th>{t('patients.tabs.summary.thRoute')}</th></tr></thead>
              <tbody>
                {medications.map((m: any, i: number) => (
                  <tr key={i}><td className="fw-semibold">{m.drug}</td><td>{m.dosage || '—'}</td><td>{m.route || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-muted small py-3">{t('patients.tabs.summary.noMedications')}</div>
          )}
        </div>
      </div>

      {/* Vital signs */}
      <div className="card border-0 shadow-sm mt-3" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold"><i className="bi bi-heart-pulse me-2 text-danger"></i>{t('patients.tabs.summary.vitalsLast24')}</h6>
          <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={onViewTrend}><i className="bi bi-graph-up me-1"></i>{t('patients.tabs.summary.viewTrend')}</button>
        </div>
        <div className="card-body p-0">
          {vitals.length ? (
            <table className="table table-sm small mb-0">
              <thead className="table-light"><tr><th>{t('patients.tabs.summary.thDateTime')}</th><th>{t('patients.tabs.summary.thTempF')}</th><th>{t('patients.tabs.summary.thHr')}</th><th>{t('patients.tabs.summary.thBp')}</th><th>{t('patients.tabs.summary.thRr')}</th><th>{t('patients.tabs.summary.thSpo2')}</th><th>{t('patients.tabs.summary.thWeight')}</th></tr></thead>
              <tbody>
                {vitals.slice(0, 5).map((v: any, i: number) => (
                  <tr key={i}>
                    <td className="text-nowrap">{v.date ? new Date(v.date).toLocaleString() : '—'}</td>
                    <td>{formatVitalUnit(v.temperature, 1, '°')}</td>
                    <td>{formatVital(v.pulse)}</td>
                    <td>{formatBP(v.bps, v.bpd)}</td>
                    <td>{formatVital(v.respiration)}</td>
                    <td>{formatVitalUnit(v.oxygen_saturation, 0, '%')}</td>
                    <td>{formatVitalUnit(v.weight, 1, ' kg')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-muted py-3 small">{t('patients.tabs.summary.noVitals')}</div>
          )}
        </div>
      </div>

      {/* Recent labs + active orders */}
      <div className="row g-3 mt-1">
        <div className="col-md-7">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
            <div className="card-header bg-white py-2"><h6 className="mb-0 fw-bold"><i className="bi bi-droplet me-2 text-info"></i>{t('patients.tabs.summary.recentLabs')}</h6></div>
            <div className="card-body p-0">
              {labResults.length ? (
                <table className="table table-sm small mb-0">
                  <thead className="table-light"><tr><th>{t('patients.tabs.summary.thTest')}</th><th>{t('patients.tabs.summary.thResult')}</th><th>{t('patients.tabs.summary.thUnits')}</th><th>{t('patients.tabs.summary.thFlag')}</th><th>{t('patients.tabs.summary.thStatus')}</th><th>{t('patients.tabs.summary.thDate')}</th></tr></thead>
                  <tbody>
                    {labResults.slice(0, 6).map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="fw-semibold">{r.test_name || r.result_code}</td>
                        <td>{r.result ?? '—'}</td>
                        <td>{r.units || '—'}</td>
                        <td>{r.abnormal && r.abnormal !== 'N' ? <span className="badge bg-danger">{t('patients.tabs.summary.labAbnormal')}</span> : <span className="text-muted">—</span>}</td>
                        <td>
                          {r.order_status === 'validated'
                            ? <span className="badge bg-primary">{t('patients.tabs.summary.validated')}</span>
                            : r.order_status
                              ? <span className="badge bg-light text-dark border">{r.order_status}</span>
                              : <span className="text-muted">—</span>}
                        </td>
                        <td className="text-nowrap">{r.result_date ? new Date(r.result_date).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-muted small py-3">{t('patients.tabs.summary.noLabResults')}</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-5">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
            <div className="card-header bg-white py-2"><h6 className="mb-0 fw-bold"><i className="bi bi-card-checklist me-2 text-success"></i>{t('patients.tabs.summary.activeOrders')}</h6></div>
            <div className="card-body p-0">
              {labOrders.length ? (
                <table className="table table-sm small mb-0">
                  <thead className="table-light"><tr><th>{t('patients.tabs.summary.thOrder')}</th><th>{t('patients.tabs.summary.thStatus')}</th></tr></thead>
                  <tbody>
                    {labOrders.slice(0, 6).map((o: any, i: number) => (
                      <tr key={i}>
                        <td className="fw-semibold">{o.instructions || t('patients.tabs.summary.labTest')}</td>
                        <td><span className="badge bg-light text-dark border">{o.orderStatus || 'pending'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-muted small py-3">{t('patients.tabs.summary.noActiveOrders')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
