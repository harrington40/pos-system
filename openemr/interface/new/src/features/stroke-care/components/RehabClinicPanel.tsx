import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStrokeBpReading,
  addStrokeClinicVisit,
  addStrokeFunctionalAssessment,
  addStrokeRehabReferral,
  addStrokeRehabSession,
  listStrokeBpReadings,
  listStrokeClinicVisits,
  listStrokeFunctionalAssessments,
  listStrokeRehabReferrals,
  updateStrokeRehabReferral,
} from '../../../api/endpoints/strokeCare';
import { formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';
import MedicationReconciliationPanel from './MedicationReconciliationPanel';

interface Props {
  pid: number;
  activationId: number;
  canDocument: boolean;
  onChanged: () => void;
}

const DISCIPLINES = [
  'physical_therapy',
  'occupational_therapy',
  'speech_language_therapy',
  'swallowing_therapy',
  'cognitive_rehabilitation',
];

function nowLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

/**
 * Modules F and G. Rehabilitation referrals, clinician-entered mRS/Barthel
 * scores, therapy sessions, longitudinal clinic visits and BP monitoring.
 * Scores are never derived from attendance, and follow-up appointments keep
 * their existing scheduling identifiers.
 */
export default function RehabClinicPanel({
  pid,
  activationId,
  canDocument,
  onChanged,
}: Props) {
  const qc = useQueryClient();
  const [discipline, setDiscipline] = useState('physical_therapy');
  const [referralReason, setReferralReason] = useState('');
  const [instrument, setInstrument] = useState<'mrs' | 'barthel'>('mrs');
  const [score, setScore] = useState('0');
  const [assessedAt, setAssessedAt] = useState(nowLocal());
  const [assessedBy, setAssessedBy] = useState('');
  const [visitAt, setVisitAt] = useState(nowLocal());
  const [neurologist, setNeurologist] = useState('');
  const [historyReview, setHistoryReview] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [ldl, setLdl] = useState('');
  const [carePlan, setCarePlan] = useState('');
  const [education, setEducation] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [bpAt, setBpAt] = useState(nowLocal());
  const [error, setError] = useState('');

  const { data: referrals = [] } = useQuery({
    queryKey: ['stroke-rehab-referrals', pid],
    queryFn: () => listStrokeRehabReferrals(pid),
  });
  const { data: functional = [] } = useQuery({
    queryKey: ['stroke-functional', pid],
    queryFn: () => listStrokeFunctionalAssessments(pid),
  });
  const { data: visits = [] } = useQuery({
    queryKey: ['stroke-clinic-visits', pid],
    queryFn: () => listStrokeClinicVisits(pid),
  });
  const { data: bp = [] } = useQuery({
    queryKey: ['stroke-bp', pid],
    queryFn: () => listStrokeBpReadings(pid),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['stroke-rehab'] });
    qc.invalidateQueries({ queryKey: ['stroke-functional'] });
    qc.invalidateQueries({ queryKey: ['stroke-clinic-visits'] });
    qc.invalidateQueries({ queryKey: ['stroke-bp'] });
    onChanged();
  };
  const fail = (e: unknown) =>
    setError(apiErrorMessage(e, 'The rehabilitation action failed'));

  const addReferral = useMutation({
    mutationFn: () =>
      addStrokeRehabReferral(pid, {
        activationId,
        discipline,
        reason: referralReason.trim() || undefined,
      }),
    onSuccess: () => {
      setReferralReason('');
      refresh();
    },
    onError: fail,
  });

  const acceptReferral = useMutation({
    mutationFn: (referralId: number) =>
      updateStrokeRehabReferral(referralId, 'accepted'),
    onSuccess: refresh,
    onError: fail,
  });

  const addSession = useMutation({
    mutationFn: (referralId: number) =>
      addStrokeRehabSession(referralId, {
        scheduledAt: nowLocal(),
        attended: null,
        therapistName: assessedBy.trim() || null,
      }),
    onSuccess: refresh,
    onError: fail,
  });

  const addFunctional = useMutation({
    mutationFn: () =>
      addStrokeFunctionalAssessment(pid, {
        instrument,
        score: Number(score),
        assessedAt,
        assessedByName: assessedBy.trim() || null,
        activationId,
      }),
    onSuccess: () => {
      setScore('0');
      refresh();
    },
    onError: fail,
  });

  const addVisit = useMutation({
    mutationFn: () =>
      addStrokeClinicVisit(pid, {
        activationId,
        visitAt,
        neurologistName: neurologist.trim() || null,
        historyReview: historyReview.trim() || null,
        hba1c: hba1c.trim() ? Number(hba1c) : null,
        ldl: ldl.trim() ? Number(ldl) : null,
        carePlan: carePlan.trim() || null,
        patientEducation: education.trim() || null,
        nextFollowupDate: nextFollowUp || null,
        visitType: 'follow_up',
      }),
    onSuccess: () => {
      setHistoryReview('');
      setCarePlan('');
      refresh();
    },
    onError: fail,
  });

  const addBp = useMutation({
    mutationFn: () =>
      addStrokeBpReading(pid, {
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        pulse: pulse.trim() ? Number(pulse) : null,
        measuredAt: bpAt,
      }),
    onSuccess: () => {
      setSystolic('');
      setDiastolic('');
      refresh();
    },
    onError: fail,
  });

  return (
    <div className="small">
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="fw-semibold mb-1">Rehabilitation referrals</div>
          {canDocument && (
            <form
              className="row g-1 mb-2"
              onSubmit={(event) => {
                event.preventDefault();
                addReferral.mutate();
              }}
            >
              <div className="col-5">
                <select
                  aria-label="Rehabilitation discipline"
                  className="form-select form-select-sm"
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value)}
                >
                  {DISCIPLINES.map((item) => (
                    <option key={item} value={item}>
                      {item.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-5">
                <input
                  aria-label="Referral reason"
                  className="form-control form-control-sm"
                  placeholder="Reason"
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                />
              </div>
              <div className="col-2">
                <button
                  className="btn btn-sm btn-outline-primary w-100"
                  type="submit"
                  disabled={addReferral.isPending}
                >
                  Refer
                </button>
              </div>
            </form>
          )}
          <ul className="list-group list-group-flush mb-3">
            {referrals.map((referral) => (
              <li key={referral.id} className="list-group-item px-0 py-1">
                <span className="fw-semibold">
                  {referral.discipline.replace(/_/g, ' ')}
                </span>{' '}
                · {referral.status} · {formatWhen(referral.referred_at)}
                <div className="text-muted">
                  {referral.reason || 'No reason recorded'} ·{' '}
                  {referral.session_count ?? 0} sessions
                </div>
                {canDocument && referral.status === 'referral' && (
                  <button
                    className="btn btn-sm btn-link p-0"
                    type="button"
                    onClick={() => acceptReferral.mutate(referral.id)}
                  >
                    Accept referral
                  </button>
                )}
                {canDocument && referral.status === 'accepted' && (
                  <button
                    className="btn btn-sm btn-link p-0"
                    type="button"
                    onClick={() => addSession.mutate(referral.id)}
                  >
                    Schedule session
                  </button>
                )}
              </li>
            ))}
            {!referrals.length && (
              <li className="list-group-item px-0 text-muted">
                No rehabilitation referrals.
              </li>
            )}
          </ul>
        </div>
        <div className="col-lg-6">
          <div className="fw-semibold mb-1">
            Functional assessments (clinician-entered)
          </div>
          {canDocument && (
            <form
              className="row g-1 mb-2"
              onSubmit={(event) => {
                event.preventDefault();
                addFunctional.mutate();
              }}
            >
              <div className="col-4">
                <select
                  aria-label="Functional instrument"
                  className="form-select form-select-sm"
                  value={instrument}
                  onChange={(e) =>
                    setInstrument(e.target.value as 'mrs' | 'barthel')
                  }
                >
                  <option value="mrs">modified Rankin Scale</option>
                  <option value="barthel">Barthel Index</option>
                </select>
              </div>
              <div className="col-2">
                <input
                  aria-label="Functional score"
                  className="form-control form-control-sm"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="col-3">
                <input
                  aria-label="Assessed at"
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={assessedAt}
                  onChange={(e) => setAssessedAt(e.target.value)}
                />
              </div>
              <div className="col-2">
                <input
                  aria-label="Assessed by"
                  className="form-control form-control-sm"
                  placeholder="Clinician"
                  value={assessedBy}
                  onChange={(e) => setAssessedBy(e.target.value)}
                />
              </div>
              <div className="col-1">
                <button
                  className="btn btn-sm btn-outline-primary w-100"
                  type="submit"
                  disabled={addFunctional.isPending}
                >
                  Add
                </button>
              </div>
            </form>
          )}
          <ul className="list-group list-group-flush">
            {functional.map((item) => (
              <li key={item.id} className="list-group-item px-0 py-1">
                <span className="fw-semibold">
                  {item.instrument === 'mrs' ? 'mRS' : 'Barthel'}: {item.score}
                </span>{' '}
                · {formatWhen(item.assessed_at)} ·{' '}
                {item.assessed_by_name || 'Clinician not recorded'}
              </li>
            ))}
            {!functional.length && (
              <li className="list-group-item px-0 text-muted">
                No functional assessments. Scores are entered by a clinician.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="row g-3 mt-1">
        <div className="col-lg-7">
          <div className="fw-semibold mb-1">Outpatient stroke clinic visits</div>
          {canDocument && (
            <form
              className="row g-1 mb-2"
              onSubmit={(event) => {
                event.preventDefault();
                addVisit.mutate();
              }}
            >
              <div className="col-md-3">
                <input
                  aria-label="Visit date"
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={visitAt}
                  onChange={(e) => setVisitAt(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <input
                  aria-label="Neurologist"
                  className="form-control form-control-sm"
                  placeholder="Neurologist"
                  value={neurologist}
                  onChange={(e) => setNeurologist(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <input
                  aria-label="HbA1c"
                  className="form-control form-control-sm"
                  placeholder="HbA1c %"
                  value={hba1c}
                  onChange={(e) => setHba1c(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="col-md-2">
                <input
                  aria-label="LDL"
                  className="form-control form-control-sm"
                  placeholder="LDL"
                  value={ldl}
                  onChange={(e) => setLdl(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="col-md-2">
                <input
                  aria-label="Next follow-up"
                  type="date"
                  className="form-control form-control-sm"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <input
                  aria-label="History review"
                  className="form-control form-control-sm"
                  placeholder="Stroke history review"
                  value={historyReview}
                  onChange={(e) => setHistoryReview(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <input
                  aria-label="Care plan"
                  className="form-control form-control-sm"
                  placeholder="Follow-up care plan"
                  value={carePlan}
                  onChange={(e) => setCarePlan(e.target.value)}
                />
              </div>
              <div className="col-md-10">
                <input
                  aria-label="Patient education"
                  className="form-control form-control-sm"
                  placeholder="Patient education documented"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <button
                  className="btn btn-sm btn-outline-primary w-100"
                  type="submit"
                  disabled={addVisit.isPending}
                >
                  Save visit
                </button>
              </div>
            </form>
          )}
          <ul className="list-group list-group-flush">
            {visits.map((visit) => (
              <li key={visit.id} className="list-group-item px-0 py-1">
                <span className="fw-semibold">{formatWhen(visit.visit_at)}</span>{' '}
                · {visit.neurologist_name || 'Neurologist not recorded'} ·{' '}
                {visit.visit_type}
                <div className="text-muted">
                  HbA1c {visit.hba1c ?? '—'} · LDL {visit.ldl ?? '—'} · next{' '}
                  {visit.next_followup_date || 'not scheduled'}
                  {visit.appointment_id
                    ? ` · appointment #${visit.appointment_id}`
                    : ''}
                </div>
                {visit.care_plan && <div>Plan: {visit.care_plan}</div>}
              </li>
            ))}
            {!visits.length && (
              <li className="list-group-item px-0 text-muted">
                No clinic visits recorded.
              </li>
            )}
          </ul>
        </div>
        <div className="col-lg-5">
          <div className="fw-semibold mb-1">Blood-pressure monitoring</div>
          {canDocument && (
            <form
              className="row g-1 mb-2"
              onSubmit={(event) => {
                event.preventDefault();
                addBp.mutate();
              }}
            >
              <div className="col-3">
                <input
                  aria-label="Systolic"
                  className="form-control form-control-sm"
                  placeholder="SBP"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="col-3">
                <input
                  aria-label="Diastolic"
                  className="form-control form-control-sm"
                  placeholder="DBP"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="col-2">
                <input
                  aria-label="Pulse"
                  className="form-control form-control-sm"
                  placeholder="Pulse"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="col-3">
                <input
                  aria-label="Measured at"
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={bpAt}
                  onChange={(e) => setBpAt(e.target.value)}
                />
              </div>
              <div className="col-1">
                <button
                  className="btn btn-sm btn-outline-primary w-100"
                  type="submit"
                  disabled={addBp.isPending}
                >
                  +
                </button>
              </div>
            </form>
          )}
          <ul className="list-group list-group-flush">
            {bp
              .slice()
              .reverse()
              .slice(0, 10)
              .map((reading) => (
                <li key={reading.id} className="list-group-item px-0 py-1">
                  <span className="fw-semibold">
                    {reading.systolic}/{reading.diastolic}
                  </span>{' '}
                  mmHg · pulse {reading.pulse ?? '—'} ·{' '}
                  {formatWhen(reading.measured_at)}
                </li>
              ))}
            {!bp.length && (
              <li className="list-group-item px-0 text-muted">
                No BP readings recorded.
              </li>
            )}
          </ul>
        </div>
      </div>

      <MedicationReconciliationPanel
        visits={visits}
        canDocument={canDocument}
        onSaved={refresh}
      />
    </div>
  );
}
