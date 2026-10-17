import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { closeStrokeActivation } from '../../../api/endpoints/strokeCare';
import { apiErrorMessage } from '../errors';

interface Props {
  activationId: number;
  canClose: boolean;
  onClosed: () => void;
}

/** Close the alert with a recorded outcome (never silently drop an alert). */
export default function CloseAlertButton({
  activationId,
  canClose,
  onClosed,
}: Props) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [disposition, setDisposition] = useState('admitted');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const close = useMutation({
    mutationFn: () =>
      closeStrokeActivation(activationId, {
        outcome: outcome.trim(),
        disposition,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      setOpen(false);
      setError('');
      onClosed();
    },
    onError: (e) => setError(apiErrorMessage(e, 'Could not close the alert')),
  });

  if (!canClose) return null;

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        onClick={() => setOpen(true)}
      >
        Close alert
      </button>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!outcome.trim()) {
      setError('An outcome is required to close the alert.');
      return;
    }
    close.mutate();
  };

  return (
    <form className="border rounded p-2 mt-2" onSubmit={submit}>
      {error && <div className="alert alert-danger py-1 small">{error}</div>}
      <div className="row g-2 align-items-end">
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="close-outcome">
            Outcome
          </label>
          <input
            id="close-outcome"
            className="form-control form-control-sm"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="e.g. Admitted to stroke unit"
          />
        </div>
        <div className="col-md-3">
          <label className="form-label small fw-semibold" htmlFor="close-disposition">
            Disposition
          </label>
          <select
            id="close-disposition"
            className="form-select form-select-sm"
            value={disposition}
            onChange={(e) => setDisposition(e.target.value)}
          >
            <option value="admitted">Admitted</option>
            <option value="discharged_home">Discharged home</option>
            <option value="discharged_rehab">Discharged to rehabilitation</option>
            <option value="transferred">Transferred</option>
            <option value="deceased">Deceased</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small fw-semibold" htmlFor="close-notes">
            Notes
          </label>
          <input
            id="close-notes"
            className="form-control form-control-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="col-md-2 d-flex gap-2">
          <button className="btn btn-sm btn-danger" type="submit" disabled={close.isPending}>
            Close
          </button>
          <button type="button" className="btn btn-sm btn-link" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
