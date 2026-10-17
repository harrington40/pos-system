import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getClinicalTimeline,
  recordStrokeMilestone,
  type TimeQuality,
} from '../../../api/endpoints/strokeCare';
import { formatMinutes, formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  activationId: number;
  canDocument: boolean;
  onChanged: () => void;
}

const QUALITIES: TimeQuality[] = ['unknown', 'estimated', 'reported', 'verified'];

function qualityBadge(quality: TimeQuality): string {
  if (quality === 'verified') return 'bg-success-subtle text-success';
  if (quality === 'reported') return 'bg-primary-subtle text-primary';
  if (quality === 'estimated') return 'bg-warning-subtle text-warning-emphasis';
  return 'bg-secondary-subtle text-secondary';
}

/** Quality-tagged clinical timeline; unknown events keep no timestamp. */
export default function ClinicalTimelinePanel({
  activationId,
  canDocument,
  onChanged,
}: Props) {
  const qc = useQueryClient();
  const [milestoneKey, setMilestoneKey] = useState('first_clinical_assessment');
  const [quality, setQuality] = useState<TimeQuality>('reported');
  const [occurredAt, setOccurredAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['stroke-clinical-timeline', activationId],
    queryFn: () => getClinicalTimeline(activationId),
  });

  const record = useMutation({
    mutationFn: () =>
      recordStrokeMilestone(activationId, {
        milestoneKey,
        timeQuality: quality,
        occurredAt:
          quality === 'unknown'
            ? null
            : occurredAt
              ? new Date(occurredAt).toISOString()
              : null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      setNotes('');
      setError('');
      qc.invalidateQueries({ queryKey: ['stroke-clinical-timeline', activationId] });
      onChanged();
    },
    onError: (e) => setError(apiErrorMessage(e, 'Could not record the milestone')),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (quality !== 'unknown' && !occurredAt) {
      setError('A timestamp is required for a non-unknown event.');
      return;
    }
    record.mutate();
  };

  if (isLoading) return <p className="text-muted small">Loading timeline…</p>;
  if (loadError || !data) {
    return <p className="text-danger small">The clinical timeline could not be loaded.</p>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="badge bg-info-subtle text-info-emphasis text-uppercase">
          {data.pathway} pathway
        </span>
        <span className="text-muted small">Unknown events get no timestamp.</span>
      </div>

      {canDocument && (
        <form className="row g-2 align-items-end mb-3" onSubmit={submit}>
          {error && (
            <div className="col-12">
              <div className="alert alert-danger py-2 small mb-0">{error}</div>
            </div>
          )}
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="tl-key">Milestone</label>
            <select
              id="tl-key"
              className="form-select form-select-sm"
              value={milestoneKey}
              onChange={(e) => setMilestoneKey(e.target.value)}
            >
              {data.milestones.map((milestone) => (
                <option key={milestone.key} value={milestone.key}>{milestone.label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold" htmlFor="tl-quality">Time quality</label>
            <select
              id="tl-quality"
              className="form-select form-select-sm"
              value={quality}
              onChange={(e) => setQuality(e.target.value as TimeQuality)}
            >
              {QUALITIES.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="tl-time">Occurred at</label>
            <input
              id="tl-time"
              type="datetime-local"
              className="form-control form-control-sm"
              value={occurredAt}
              disabled={quality === 'unknown'}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold" htmlFor="tl-notes">Notes</label>
            <input
              id="tl-notes"
              className="form-control form-control-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="col-md-2 d-grid">
            <button className="btn btn-sm btn-outline-primary" type="submit" disabled={record.isPending}>
              Record
            </button>
          </div>
        </form>
      )}

      <div className="table-responsive">
        <table className="table table-sm align-middle small mb-0">
          <thead className="table-light">
            <tr><th>Milestone</th><th>Time</th><th>Quality</th><th>From arrival</th><th>Source</th></tr>
          </thead>
          <tbody>
            {data.milestones.map((milestone) => (
              <tr key={milestone.key}>
                <td className="fw-semibold">{milestone.label}</td>
                <td>{milestone.occurredAt ? formatWhen(milestone.occurredAt) : '—'}</td>
                <td><span className={`badge ${qualityBadge(milestone.timeQuality)}`}>{milestone.timeQuality}</span></td>
                <td>{formatMinutes(milestone.minutesFromArrival)}</td>
                <td className="text-muted">
                  {milestone.source}{milestone.derived ? ' (derived)' : ''}
                  {milestone.recordedBy ? ` · ${milestone.recordedBy}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
