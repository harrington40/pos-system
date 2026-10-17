import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  recordStrokeDecision,
  type DecisionInput,
  type StrokeCriterion,
  type StrokeDecision,
  type TreatmentCriteria,
} from '../../../api/endpoints/strokeCare';
import { formatMinutes, formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  activationId: number;
  criteria: TreatmentCriteria;
  decisions: StrokeDecision[];
  canDecide: boolean;
  onChanged: () => void;
}

function criterionBadge(status: StrokeCriterion['status']): string {
  if (status === 'met') return 'bg-success-subtle text-success';
  if (status === 'not_met') return 'bg-danger-subtle text-danger';
  return 'bg-warning-subtle text-warning-emphasis';
}

function CriterionList({ items }: { items: StrokeCriterion[] }) {
  return (
    <ul className="list-unstyled small mb-0">
      {items.map((item) => (
        <li key={item.key} className="mb-1">
          <span className={`badge ${criterionBadge(item.status)} me-2`}>
            {item.status.replace('_', ' ')}
          </span>
          <span className="fw-semibold">{item.label}</span>
          <div className="text-muted">{item.detail}</div>
        </li>
      ))}
    </ul>
  );
}

/** Advisory reperfusion checklist plus the clinician's documented decision. */
export default function DecisionPanel({
  activationId,
  criteria,
  decisions,
  canDecide,
  onChanged,
}: Props) {
  const [decisionType, setDecisionType] =
    useState<DecisionInput['decisionType']>('thrombolysis');
  const [decision, setDecision] =
    useState<DecisionInput['decision']>('pending');
  const [reason, setReason] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [platelets, setPlatelets] = useState('');
  const [inr, setInr] = useState('');
  const [age, setAge] = useState('');
  const [ctExcluded, setCtExcluded] = useState('unknown');
  const [anticoagulated, setAnticoagulated] = useState('unknown');
  const [lvo, setLvo] = useState('unknown');
  const [lateSelection, setLateSelection] = useState('unknown');
  const [error, setError] = useState('');

  const numeric = (value: string): number | null =>
    value.trim() === '' ? null : Number(value);
  const booleanFrom = (value: string): boolean | null =>
    value === 'unknown' ? null : value === 'yes';

  const record = useMutation({
    mutationFn: () =>
      recordStrokeDecision(activationId, {
        decisionType,
        decision,
        reason: reason.trim() || null,
        systolicBloodPressure: numeric(systolic),
        diastolicBloodPressure: numeric(diastolic),
        glucose: numeric(glucose),
        plateletCount: numeric(platelets),
        inr: numeric(inr),
        age: numeric(age),
        ctExcludedHemorrhage: booleanFrom(ctExcluded),
        anticoagulantUse: booleanFrom(anticoagulated),
        largeVesselOcclusion: booleanFrom(lvo),
        imagingSelectionForLateWindow: booleanFrom(lateSelection),
      }),
    onSuccess: () => {
      setError('');
      setReason('');
      onChanged();
    },
    onError: (e) =>
      setError(apiErrorMessage(e, 'Could not record the decision')),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    record.mutate();
  };

  return (
    <div>
      <div className="alert alert-warning py-2 small">
        <i className="bi bi-shield-exclamation me-1"></i>
        Advisory checklist only.{' '}
        {criteria.minutesFromLastKnownWell === null
          ? 'Last known well is not documented.'
          : `${formatMinutes(criteria.minutesFromLastKnownWell)} from last known well.`}{' '}
        {criteria.thrombolysis.unmetOrUnknown} thrombolysis criterion/criteria
        unmet or unknown; {criteria.thrombectomy.unmetOrUnknown} for
        thrombectomy. The treating clinician makes the decision.
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <h6 className="small fw-semibold">
            IV thrombolysis (target ≤ {criteria.thrombolysis.windowMinutes} min)
          </h6>
          <CriterionList items={criteria.thrombolysis.criteria} />
        </div>
        <div className="col-md-6">
          <h6 className="small fw-semibold">
            Thrombectomy (target ≤ {criteria.thrombectomy.windowMinutes} min)
          </h6>
          <CriterionList items={criteria.thrombectomy.criteria} />
        </div>
      </div>

      {canDecide ? (
        <form onSubmit={submit}>
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label small fw-semibold" htmlFor="dec-type">
                Therapy
              </label>
              <select
                id="dec-type"
                className="form-select form-select-sm"
                value={decisionType}
                onChange={(e) =>
                  setDecisionType(
                    e.target.value as DecisionInput['decisionType'],
                  )
                }
              >
                <option value="thrombolysis">IV thrombolysis</option>
                <option value="thrombectomy">Thrombectomy</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold" htmlFor="dec-outcome">
                Decision
              </label>
              <select
                id="dec-outcome"
                className="form-select form-select-sm"
                value={decision}
                onChange={(e) =>
                  setDecision(e.target.value as DecisionInput['decision'])
                }
              >
                <option value="pending">Pending review</option>
                <option value="given">Given</option>
                <option value="withheld">Withheld</option>
                <option value="not_indicated">Not indicated</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="dec-reason">
                Reason / note
              </label>
              <input
                id="dec-reason"
                className="form-control form-control-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Required when withheld or not indicated"
              />
            </div>

            {[
              ['Systolic BP', systolic, setSystolic, 'dec-sys'],
              ['Diastolic BP', diastolic, setDiastolic, 'dec-dia'],
              ['Glucose (mg/dL)', glucose, setGlucose, 'dec-glu'],
              ['Platelets (/µL)', platelets, setPlatelets, 'dec-plt'],
              ['INR', inr, setInr, 'dec-inr'],
              ['Age', age, setAge, 'dec-age'],
            ].map(([label, value, setter, id]) => (
              <div className="col-md-2" key={String(id)}>
                <label className="form-label small fw-semibold" htmlFor={String(id)}>
                  {String(label)}
                </label>
                <input
                  id={String(id)}
                  className="form-control form-control-sm"
                  value={String(value)}
                  inputMode="decimal"
                  onChange={(e) =>
                    (setter as (v: string) => void)(e.target.value)
                  }
                />
              </div>
            ))}

            {[
              ['CT excludes haemorrhage', ctExcluded, setCtExcluded, 'dec-ct'],
              ['Anticoagulated', anticoagulated, setAnticoagulated, 'dec-ac'],
              ['Large vessel occlusion', lvo, setLvo, 'dec-lvo'],
              ['Late-window imaging selection', lateSelection, setLateSelection, 'dec-late'],
            ].map(([label, value, setter, id]) => (
              <div className="col-md-3" key={String(id)}>
                <label className="form-label small fw-semibold" htmlFor={String(id)}>
                  {String(label)}
                </label>
                <select
                  id={String(id)}
                  className="form-select form-select-sm"
                  value={String(value)}
                  onChange={(e) =>
                    (setter as (v: string) => void)(e.target.value)
                  }
                >
                  <option value="unknown">Not documented</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            ))}
          </div>
          <button
            className="btn btn-sm btn-outline-danger mt-3"
            type="submit"
            disabled={record.isPending}
          >
            {record.isPending ? 'Recording…' : 'Record clinician decision'}
          </button>
          <p className="small text-muted mt-2 mb-0">
            Recording a decision starts a signed entry in the audit trail.
          </p>
        </form>
      ) : (
        <p className="text-muted small">
          Only a physician or administrator can record a reperfusion decision.
        </p>
      )}

      <h6 className="small fw-semibold text-uppercase text-muted mt-3">
        Recorded decisions
      </h6>
      {decisions.length === 0 ? (
        <p className="text-muted small mb-0">No decision has been recorded.</p>
      ) : (
        <ul className="list-group list-group-flush small">
          {decisions.map((entry) => (
            <li key={entry.id} className="list-group-item px-0">
              <span className="fw-semibold text-capitalize">
                {entry.decision_type}: {entry.decision}
              </span>
              <div className="text-muted">
                {entry.decided_by_name || 'unknown'} ·{' '}
                {formatWhen(entry.decided_at)}
                {entry.reason ? ` · ${entry.reason}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
