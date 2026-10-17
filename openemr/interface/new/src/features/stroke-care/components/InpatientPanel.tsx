import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addInpatientAssessment,
  addStrokeCarePlan,
  addStrokeComplication,
  admitStrokeInpatient,
  dischargeStrokeInpatient,
  getInpatientDashboard,
  listInpatientAssessments,
  listInpatientStays,
  listStrokeCarePlans,
  listStrokeComplications,
  saveStrokeDischargePlan,
} from '../../../api/endpoints/strokeCare';
import { formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  activationId: number;
  canDocument: boolean;
  onChanged: () => void;
}

const ASSESSMENT_TYPES = [
  'neuro',
  'nursing',
  'swallow',
  'fall_risk',
  'mobility',
];
const RISK_LEVELS = ['low', 'moderate', 'high', 'critical'];

/**
 * Module E. Admission, neuro/nursing observations, swallow, fall-risk,
 * mobility, care plans, complications and discharge planning. Vitals, MAR,
 * laboratory and imaging follow-up are read from their existing modules.
 */
export default function InpatientPanel({
  activationId,
  canDocument,
  onChanged,
}: Props) {
  const qc = useQueryClient();
  const [unit, setUnit] = useState('Stroke unit');
  const [room, setRoom] = useState('');
  const [attending, setAttending] = useState('');
  const [assessmentType, setAssessmentType] = useState('neuro');
  const [riskLevel, setRiskLevel] = useState('low');
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');
  const [planSummary, setPlanSummary] = useState('');
  const [goals, setGoals] = useState('');
  const [complicationType, setComplicationType] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [disposition, setDisposition] = useState('home');
  const [destination, setDestination] = useState('home');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');

  const { data: stays = [] } = useQuery({
    queryKey: ['stroke-inpatient-stays'],
    queryFn: () => listInpatientStays(),
    refetchInterval: 30000,
  });

  const stay = useMemo(
    () => stays.find((entry) => entry.activation_id === activationId),
    [stays, activationId],
  );

  const { data: dashboard } = useQuery({
    queryKey: ['stroke-inpatient-dashboard'],
    queryFn: () => getInpatientDashboard(),
    refetchInterval: 30000,
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ['stroke-inpatient-assessments', stay?.id],
    queryFn: () => listInpatientAssessments(stay!.id),
    enabled: !!stay,
  });
  const { data: plans = [] } = useQuery({
    queryKey: ['stroke-care-plans', activationId],
    queryFn: () => listStrokeCarePlans(activationId),
  });
  const { data: complications = [] } = useQuery({
    queryKey: ['stroke-complications', activationId],
    queryFn: () => listStrokeComplications(activationId),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['stroke-inpatient'] });
    qc.invalidateQueries({ queryKey: ['stroke-inpatient-stays'] });
    qc.invalidateQueries({ queryKey: ['stroke-inpatient-assessments'] });
    qc.invalidateQueries({ queryKey: ['stroke-care-plans'] });
    qc.invalidateQueries({ queryKey: ['stroke-complications'] });
    onChanged();
  };
  const fail = (e: unknown) =>
    setError(apiErrorMessage(e, 'The inpatient action failed'));

  const admit = useMutation({
    mutationFn: () =>
      admitStrokeInpatient(activationId, {
        unit: unit.trim() || null,
        room: room.trim() || null,
        attendingName: attending.trim() || null,
      }),
    onSuccess: () => {
      setError('');
      refresh();
    },
    onError: fail,
  });

  const addAssessment = useMutation({
    mutationFn: () =>
      addInpatientAssessment(stay!.id, {
        assessmentType,
        riskLevel,
        score: score.trim() ? Number(score) : null,
        notes: notes.trim() || null,
        data: { documented: true },
      }),
    onSuccess: () => {
      setNotes('');
      setScore('');
      setError('');
      refresh();
    },
    onError: fail,
  });

  const addPlan = useMutation({
    mutationFn: () =>
      addStrokeCarePlan(activationId, {
        planType: 'multidisciplinary',
        summary: planSummary.trim() || null,
        goals: goals
          .split('\n')
          .map((goal) => goal.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      setPlanSummary('');
      setGoals('');
      refresh();
    },
    onError: fail,
  });

  const addProblem = useMutation({
    mutationFn: () =>
      addStrokeComplication(activationId, {
        complicationType: complicationType.trim(),
        severity,
      }),
    onSuccess: () => {
      setComplicationType('');
      refresh();
    },
    onError: fail,
  });

  const saveDischarge = useMutation({
    mutationFn: () =>
      saveStrokeDischargePlan(stay!.id, {
        targetDate: targetDate || null,
        destination,
        status: 'planning',
      }),
    onSuccess: refresh,
    onError: fail,
  });

  const discharge = useMutation({
    mutationFn: () => dischargeStrokeInpatient(stay!.id, { disposition }),
    onSuccess: refresh,
    onError: fail,
  });

  const card = dashboard?.patients.find(
    (entry) => entry.activation_id === activationId,
  );
  return (
    <div className="small">
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {!stay ? (
        canDocument ? (
          <form
            className="row g-2 align-items-end mb-3"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              admit.mutate();
            }}
          >
            <div className="col-md-3">
              <label className="form-label" htmlFor="ip-unit">
                Unit
              </label>
              <input
                id="ip-unit"
                className="form-control form-control-sm"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="ip-room">
                Bed / room
              </label>
              <input
                id="ip-room"
                className="form-control form-control-sm"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="ip-attending">
                Attending
              </label>
              <input
                id="ip-attending"
                className="form-control form-control-sm"
                value={attending}
                onChange={(e) => setAttending(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-sm btn-primary"
                type="submit"
                disabled={admit.isPending}
              >
                {admit.isPending ? 'Admitting…' : 'Admit'}
              </button>
            </div>
            <p className="text-muted mb-0">
              Bed assignment reuses the existing patient care-assignment table.
            </p>
          </form>
        ) : (
          <p className="text-muted">This activation has no inpatient stay.</p>
        )
      ) : (
        <>
          <div className="row g-2 mb-3">
            <div className="col-md-4">
              <div className="border rounded p-2 h-100">
                <div className="fw-semibold">{stay.unit || 'Inpatient'}</div>
                <div className="text-muted">
                  Room {stay.room || '—'} · admitted{' '}
                  {formatWhen(stay.admitted_at)}
                </div>
                <div>
                  Attending: {stay.attending_name || '—'} · {stay.status}
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded p-2 h-100">
                <div className="fw-semibold">Outstanding tasks</div>
                <div>
                  Tasks {card?.outstandingTasks ?? 0} · MAR due{' '}
                  {card?.medicationsDueSoon ?? 0} · labs 24h{' '}
                  {card?.labsReported24h ?? 0}
                </div>
                <div>
                  Unresolved complications {card?.unresolvedComplications ?? 0}
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded p-2 h-100">
                <div className="fw-semibold">Latest vitals</div>
                {card?.latestVitals ? (
                  <div>
                    BP {String(card.latestVitals.bps ?? '—')}/
                    {String(card.latestVitals.bpd ?? '—')} · pulse{' '}
                    {String(card.latestVitals.pulse ?? '—')} · SpO₂{' '}
                    {String(card.latestVitals.oxygen_saturation ?? '—')}
                  </div>
                ) : (
                  <span className="text-muted">No vitals recorded</span>
                )}
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-6">
              <div className="fw-semibold mb-1">
                Neurological / nursing assessments
              </div>
              {canDocument && (
                <form
                  className="row g-1 mb-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addAssessment.mutate();
                  }}
                >
                  <div className="col-5">
                    <select
                      aria-label="Assessment type"
                      className="form-select form-select-sm"
                      value={assessmentType}
                      onChange={(e) => setAssessmentType(e.target.value)}
                    >
                      {ASSESSMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-3">
                    <select
                      aria-label="Risk level"
                      className="form-select form-select-sm"
                      value={riskLevel}
                      onChange={(e) => setRiskLevel(e.target.value)}
                    >
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-2">
                    <input
                      aria-label="Score"
                      className="form-control form-control-sm"
                      placeholder="Score"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="col-2">
                    <button
                      className="btn btn-sm btn-outline-primary w-100"
                      type="submit"
                      disabled={addAssessment.isPending}
                    >
                      Add
                    </button>
                  </div>
                  <div className="col-12">
                    <input
                      aria-label="Assessment notes"
                      className="form-control form-control-sm"
                      placeholder="Observation / swallow screen / fall-risk / mobility notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </form>
              )}
              <ul className="list-group list-group-flush">
                {assessments.slice(0, 8).map((item) => (
                  <li key={item.id} className="list-group-item px-0 py-1">
                    <span className="badge bg-secondary me-1">
                      {item.assessment_type}
                    </span>
                    {item.risk_level && (
                      <span className="badge bg-warning text-dark me-1">
                        {item.risk_level}
                      </span>
                    )}
                    {item.score != null && (
                      <span className="me-1">{item.score}</span>
                    )}
                    <span className="text-muted">
                      {formatWhen(item.recorded_at)}
                    </span>
                    {item.notes && <div>{item.notes}</div>}
                  </li>
                ))}
                {!assessments.length && (
                  <li className="list-group-item px-0 text-muted">
                    No assessments documented.
                  </li>
                )}
              </ul>
            </div>

            <div className="col-lg-6">
              <div className="fw-semibold mb-1">
                Multidisciplinary care plan
              </div>
              {canDocument && (
                <form
                  className="mb-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addPlan.mutate();
                  }}
                >
                  <input
                    aria-label="Care plan summary"
                    className="form-control form-control-sm mb-1"
                    placeholder="Plan summary"
                    value={planSummary}
                    onChange={(e) => setPlanSummary(e.target.value)}
                  />
                  <textarea
                    aria-label="Care plan goals"
                    className="form-control form-control-sm mb-1"
                    placeholder="One goal per line"
                    rows={2}
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                  />
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="submit"
                    disabled={addPlan.isPending}
                  >
                    Save plan
                  </button>
                </form>
              )}
              <ul className="list-group list-group-flush">
                {plans.slice(0, 4).map((plan) => (
                  <li
                    key={String(plan.id)}
                    className="list-group-item px-0 py-1"
                  >
                    <span className="fw-semibold">
                      {String(plan.plan_type)}
                    </span>{' '}
                    · {String(plan.status)}
                    <div>{String(plan.summary ?? '')}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-3">
            <div className="fw-semibold mb-1">Complications</div>
            {canDocument && (
              <form
                className="row g-1 mb-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  addProblem.mutate();
                }}
              >
                <div className="col-6">
                  <input
                    aria-label="Complication type"
                    className="form-control form-control-sm"
                    placeholder="e.g. aspiration pneumonia"
                    value={complicationType}
                    onChange={(e) => setComplicationType(e.target.value)}
                  />
                </div>
                <div className="col-3">
                  <select
                    aria-label="Complication severity"
                    className="form-select form-select-sm"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    {['mild', 'moderate', 'severe', 'life_threatening'].map(
                      (level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="col-3">
                  <button
                    className="btn btn-sm btn-outline-danger w-100"
                    type="submit"
                    disabled={addProblem.isPending}
                  >
                    Record
                  </button>
                </div>
              </form>
            )}
            <ul className="list-group list-group-flush">
              {complications.map((item) => (
                <li key={String(item.id)} className="list-group-item px-0 py-1">
                  <span className="fw-semibold">
                    {String(item.complication_type)}
                  </span>{' '}
                  · {String(item.severity)}
                  {item.resolved_at ? ' · resolved' : ' · open'}
                </li>
              ))}
            </ul>
          </div>

          {canDocument && (
            <div className="row g-2 align-items-end mt-3 border-top pt-3">
              <div className="col-md-3">
                <label className="form-label" htmlFor="ip-destination">
                  Discharge destination
                </label>
                <input
                  id="ip-destination"
                  className="form-control form-control-sm"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="ip-target">
                  Target date
                </label>
                <input
                  id="ip-target"
                  type="date"
                  className="form-control form-control-sm"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="ip-disposition">
                  Disposition on discharge
                </label>
                <input
                  id="ip-disposition"
                  className="form-control form-control-sm"
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <button
                  className="btn btn-sm btn-outline-secondary w-100"
                  type="button"
                  onClick={() => saveDischarge.mutate()}
                  disabled={saveDischarge.isPending}
                >
                  Save plan
                </button>
              </div>
              <div className="col-md-2">
                <button
                  className="btn btn-sm btn-danger w-100"
                  type="button"
                  onClick={() => discharge.mutate()}
                  disabled={
                    discharge.isPending || stay.status === 'discharged'
                  }
                >
                  Discharge
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
