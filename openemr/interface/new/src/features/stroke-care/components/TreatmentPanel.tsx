import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getStrokePathway,
  listStrokeTreatmentEvents,
  recordStrokeTreatmentEvent,
  type TimeQuality,
} from '../../../api/endpoints/strokeCare';
import { formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  activationId: number;
  canDocument: boolean;
  onChanged: () => void;
}

const STATUSES = ['planned', 'given', 'withheld', 'not_indicated', 'completed', 'cancelled'];
const SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening'];
const QUALITIES: TimeQuality[] = ['unknown', 'estimated', 'reported', 'verified'];

function label(value: string): string {
  return value.replace(/_/g, ' ');
}

/** Clinician-directed treatment documentation; no eligibility calculation. */
export default function TreatmentPanel({ activationId, canDocument, onChanged }: Props) {
  const qc = useQueryClient();
  const [eventType, setEventType] = useState('bp_management');
  const [status, setStatus] = useState('given');
  const [medication, setMedication] = useState('');
  const [dose, setDose] = useState('');
  const [route, setRoute] = useState('');
  const [contraindications, setContraindications] = useState('');
  const [details, setDetails] = useState('');
  const [specialistName, setSpecialistName] = useState('');
  const [adverseSeverity, setAdverseSeverity] = useState('mild');
  const [occurredAt, setOccurredAt] = useState('');
  const [quality, setQuality] = useState<TimeQuality>('reported');
  const [error, setError] = useState('');

  const { data: pathway } = useQuery({
    queryKey: ['stroke-pathway', activationId],
    queryFn: () => getStrokePathway(activationId),
  });
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['stroke-treatment-events', activationId],
    queryFn: () => listStrokeTreatmentEvents(activationId),
  });

  useEffect(() => {
    if (pathway && !pathway.allowedEventTypes.includes(eventType)) {
      setEventType(pathway.allowedEventTypes[0] ?? 'other');
    }
  }, [pathway, eventType]);

  const record = useMutation({
    mutationFn: () =>
      recordStrokeTreatmentEvent(activationId, {
        eventType,
        status,
        medication: medication.trim() || null,
        dose: dose.trim() || null,
        route: route.trim() || null,
        contraindications: contraindications.trim() || null,
        details: details.trim() || null,
        specialistName: specialistName.trim() || null,
        adverseSeverity: eventType === 'adverse_event' ? adverseSeverity : null,
        occurredAt:
          quality === 'unknown'
            ? null
            : occurredAt
              ? new Date(occurredAt).toISOString()
              : null,
        timeQuality: quality,
      }),
    onSuccess: () => {
      setDetails('');
      setMedication('');
      setDose('');
      setRoute('');
      setContraindications('');
      setError('');
      qc.invalidateQueries({ queryKey: ['stroke-treatment-events', activationId] });
      qc.invalidateQueries({ queryKey: ['stroke-detail', activationId] });
      qc.invalidateQueries({ queryKey: ['stroke-clinical-timeline', activationId] });
      onChanged();
    },
    onError: (e) => setError(apiErrorMessage(e, 'Could not record the treatment event')),
  });

  const isAdministration = eventType.endsWith('_administration');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isAdministration && status === 'given' && (!occurredAt || quality === 'unknown')) {
      setError('An administration time is required when the treatment is given.');
      return;
    }
    record.mutate();
  };

  if (isLoading) return <p className="text-muted small">Loading treatment record…</p>;

  return (
    <div>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {pathway && (
        <div className="alert alert-info py-2 small">
          <span className="badge bg-info-subtle text-info-emphasis text-uppercase me-2">
            {pathway.pathway}
          </span>
          {pathway.note}
        </div>
      )}

      {canDocument && pathway && (
        <form className="row g-2 align-items-end mb-3" onSubmit={submit}>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="tx-type">Event</label>
            <select id="tx-type" className="form-select form-select-sm" value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {pathway.allowedEventTypes.map((entry) => (
                <option key={entry} value={entry}>{label(entry)}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold" htmlFor="tx-status">Status</label>
            <select id="tx-status" className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((entry) => <option key={entry} value={entry}>{label(entry)}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="tx-med">Medication</label>
            <input id="tx-med" className="form-control form-control-sm" value={medication} onChange={(e) => setMedication(e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold" htmlFor="tx-dose">Dose</label>
            <input id="tx-dose" className="form-control form-control-sm" value={dose} onChange={(e) => setDose(e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold" htmlFor="tx-route">Route</label>
            <input id="tx-route" className="form-control form-control-sm" value={route} onChange={(e) => setRoute(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="tx-time">Occurred at</label>
            <input id="tx-time" type="datetime-local" className="form-control form-control-sm" value={occurredAt} disabled={quality === 'unknown'} onChange={(e) => setOccurredAt(e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold" htmlFor="tx-quality">Time quality</label>
            <select id="tx-quality" className="form-select form-select-sm" value={quality} onChange={(e) => setQuality(e.target.value as TimeQuality)}>
              {QUALITIES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select>
          </div>
          {eventType === 'adverse_event' && (
            <div className="col-md-2">
              <label className="form-label small fw-semibold" htmlFor="tx-sev">Severity</label>
              <select id="tx-sev" className="form-select form-select-sm" value={adverseSeverity} onChange={(e) => setAdverseSeverity(e.target.value)}>
                {SEVERITIES.map((entry) => <option key={entry} value={entry}>{label(entry)}</option>)}
              </select>
            </div>
          )}
          {eventType === 'specialist_consult' && (
            <div className="col-md-3">
              <label className="form-label small fw-semibold" htmlFor="tx-spec">Specialist</label>
              <input id="tx-spec" className="form-control form-control-sm" value={specialistName} onChange={(e) => setSpecialistName(e.target.value)} />
            </div>
          )}
          <div className="col-md-5">
            <label className="form-label small fw-semibold" htmlFor="tx-contra">Contraindications</label>
            <input id="tx-contra" className="form-control form-control-sm" value={contraindications} onChange={(e) => setContraindications(e.target.value)} />
          </div>
          <div className="col-md-7">
            <label className="form-label small fw-semibold" htmlFor="tx-details">Details</label>
            <input id="tx-details" className="form-control form-control-sm" value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          <div className="col-md-3 d-grid">
            <button className="btn btn-sm btn-outline-danger" type="submit" disabled={record.isPending}>Record event</button>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <p className="text-muted small mb-0">No treatment event recorded.</p>
      ) : (
        <ul className="list-group list-group-flush small">
          {events.map((event) => (
            <li key={event.id} className="list-group-item px-0">
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <span className="fw-semibold text-capitalize">{label(event.event_type)}</span>
                <span className="badge bg-secondary">{label(event.status)}</span>
              </div>
              <div className="text-muted">
                {event.occurred_at ? formatWhen(event.occurred_at) : 'time unknown'}
                {event.time_quality ? ` · ${event.time_quality}` : ''}
                {event.medication ? ` · ${event.medication} ${event.dose ?? ''} ${event.route ?? ''}` : ''}
                {event.adverse_severity ? ` · ${event.adverse_severity}` : ''}
                {event.recorded_by_name ? ` · ${event.recorded_by_name}` : ''}
              </div>
              {event.contraindications && <div>Contraindications: {event.contraindications}</div>}
              {event.details && <div>{event.details}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
