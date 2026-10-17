import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  createStrokeActivation,
  type CareSetting,
  type StrokeType,
} from '../../../api/endpoints/strokeCare';
import { apiErrorMessage } from '../errors';

interface Props {
  onCreated: (activationId: number) => void;
}

/** Local datetime for a datetime-local input, in the clinician's timezone. */
function localNow(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/**
 * Registers a code-stroke activation. The form starts the clock; it does not
 * assign a diagnosis or a treatment. Those are documented later, with sign-off.
 */
export default function ActivationForm({ onCreated }: Props) {
  const [patientId, setPatientId] = useState('');
  const [careSetting, setCareSetting] = useState<CareSetting>('acute');
  const [arrivalAt, setArrivalAt] = useState(localNow());
  const [lkwAt, setLkwAt] = useState('');
  const [strokeType, setStrokeType] = useState<StrokeType>('not_documented');
  const [laterality, setLaterality] = useState('');
  const [codeStrokeLevel, setCodeStrokeLevel] = useState('level_2');
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: createStrokeActivation,
    onSuccess: (detail) => {
      setError('');
      setPatientId('');
      setLkwAt('');
      onCreated(detail.activation.id);
    },
    onError: (e) =>
      setError(apiErrorMessage(e, 'Could not start the activation')),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!patientId.trim()) {
      setError('Enter the patient id from the shared record.');
      return;
    }
    create.mutate({
      patientId: patientId.trim(),
      careSetting,
      arrivalAt: toIso(arrivalAt),
      lkwAt: lkwAt ? toIso(lkwAt) : null,
      strokeType,
      laterality: laterality || null,
      codeStrokeLevel: codeStrokeLevel || null,
    });
  };

  return (
    <form className="card border-0 shadow-sm" onSubmit={submit}>
      <div className="card-header bg-white fw-semibold">
        <i className="bi bi-lightning-charge-fill text-danger me-2"></i>
        New stroke activation
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="stroke-pid">
              Patient id
            </label>
            <input
              id="stroke-pid"
              className="form-control"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g. 1042"
              inputMode="numeric"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="stroke-setting">
              Care setting
            </label>
            <select
              id="stroke-setting"
              className="form-select"
              value={careSetting}
              onChange={(e) => setCareSetting(e.target.value as CareSetting)}
            >
              <option value="acute">Acute / emergency</option>
              <option value="comprehensive">Comprehensive stroke centre</option>
              <option value="outpatient">Outpatient clinic</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="stroke-arrival">
              Arrival
            </label>
            <input
              id="stroke-arrival"
              type="datetime-local"
              className="form-control"
              value={arrivalAt}
              onChange={(e) => setArrivalAt(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="stroke-lkw">
              Last known well
            </label>
            <input
              id="stroke-lkw"
              type="datetime-local"
              className="form-control"
              value={lkwAt}
              onChange={(e) => setLkwAt(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="stroke-type">
              Stroke type (if known)
            </label>
            <select
              id="stroke-type"
              className="form-select"
              value={strokeType}
              onChange={(e) => setStrokeType(e.target.value as StrokeType)}
            >
              <option value="not_documented">Not documented yet</option>
              <option value="ischemic">Ischemic</option>
              <option value="hemorrhagic">Haemorrhagic</option>
              <option value="tia">TIA</option>
              <option value="undetermined">Undetermined</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="stroke-side">
              Laterality
            </label>
            <select
              id="stroke-side"
              className="form-select"
              value={laterality}
              onChange={(e) => setLaterality(e.target.value)}
            >
              <option value="">Not documented</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="bilateral">Bilateral</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="stroke-level">
              Activation level
            </label>
            <select
              id="stroke-level"
              className="form-select"
              value={codeStrokeLevel}
              onChange={(e) => setCodeStrokeLevel(e.target.value)}
            >
              <option value="level_1">Level 1 — comprehensive</option>
              <option value="level_2">Level 2 — primary</option>
              <option value="level_3">Level 3 — acute-ready</option>
            </select>
          </div>
        </div>
        <p className="text-muted small mt-3 mb-0">
          Starting the activation records the arrival and last-known-well times
          only. NIHSS, imaging and treatment decisions are documented separately
          and each requires clinician sign-off.
        </p>
      </div>
      <div className="card-footer bg-white d-flex justify-content-end">
        <button
          className="btn btn-danger"
          type="submit"
          disabled={create.isPending}
        >
          {create.isPending ? 'Starting…' : 'Start activation'}
        </button>
      </div>
    </form>
  );
}
