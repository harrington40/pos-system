import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getStrokeMedicationReconciliation,
  saveStrokeMedicationReconciliation,
  type StrokeClinicVisit,
} from '../../../api/endpoints/strokeCare';
import { formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  visits: StrokeClinicVisit[];
  canDocument: boolean;
  onSaved: () => void;
}

const STATUSES = ['continued', 'changed', 'stopped', 'started'];

/**
 * Phase 3 medication reconciliation. The active prescription list comes from
 * the existing OpenRx prescriptions table; the clinician must explicitly
 * address every active medication before signing.
 */
export default function MedicationReconciliationPanel({
  visits,
  canDocument,
  onSaved,
}: Props) {
  const qc = useQueryClient();
  const [visitId, setVisitId] = useState<number | null>(
    visits[0]?.id ?? null,
  );
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [signedByName, setSignedByName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (visitId === null && visits.length) setVisitId(visits[0].id);
  }, [visits, visitId]);

  const { data, isLoading } = useQuery({
    queryKey: ['stroke-medication-reconciliation', visitId],
    queryFn: () => getStrokeMedicationReconciliation(visitId as number),
    enabled: visitId !== null,
  });

  useEffect(() => {
    if (!data) return;
    setStatuses(
      Object.fromEntries(
        data.medications
          .filter((med) => med.active)
          .map((med) => [med.prescriptionId, med.status]),
      ),
    );
  }, [data]);

  const complete = useMemo(
    () =>
      (data?.medications ?? [])
        .filter((med) => med.active)
        .every((med) => {
          const status = statuses[med.prescriptionId];
          return status && status !== 'not_reviewed';
        }),
    [data, statuses],
  );

  const save = useMutation({
    mutationFn: () => {
      if (!visitId) throw new Error('Select a clinic visit.');
      if (!signedByName.trim()) {
        throw new Error('Enter the clinician name.');
      }
      if (!confirmed) {
        throw new Error('Confirm the medication reconciliation.');
      }
      return saveStrokeMedicationReconciliation(visitId, {
        items: (data?.medications ?? [])
          .filter((med) => med.active)
          .map((med) => ({
            prescriptionId: med.prescriptionId,
            status: statuses[med.prescriptionId] ?? 'not_reviewed',
          })),
        signedByName: signedByName.trim(),
        signatureConfirmed: true,
      });
    },
    onSuccess: () => {
      setError('');
      setSaved('Medication reconciliation signed.');
      qc.invalidateQueries({
        queryKey: ['stroke-medication-reconciliation', visitId],
      });
      onSaved();
    },
    onError: (e) =>
      setError(apiErrorMessage(e, 'Medication reconciliation failed')),
  });

  if (!visits.length) {
    return (
      <p className="text-muted small mb-0">
        Create a clinic visit before reconciling medications.
      </p>
    );
  }

  return (
    <div className="border-top pt-2 mt-3">
      <div className="fw-semibold mb-1">Medication reconciliation</div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {saved && <div className="alert alert-success py-2">{saved}</div>}
      <div className="row g-2 align-items-end mb-2">
        <div className="col-md-6">
          <label className="form-label" htmlFor="stroke-reconcile-visit">
            Clinic visit
          </label>
          <select
            id="stroke-reconcile-visit"
            className="form-select form-select-sm"
            value={visitId ?? ''}
            onChange={(event) => {
              setVisitId(Number(event.target.value));
              setSaved('');
            }}
          >
            {visits.map((visit) => (
              <option key={visit.id} value={visit.id}>
                {formatWhen(visit.visit_at)} ·{' '}
                {visit.neurologist_name || 'Clinic visit'}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4 small text-muted">
          {data?.status === 'completed'
            ? `Signed ${formatWhen(data.reconciledAt)} by ${
                data.reconciledBy || 'clinician'
              }`
            : 'Not yet reconciled'}
        </div>
      </div>

      {isLoading && <p className="text-muted small">Loading prescriptions…</p>}
      {data && data.medications.length === 0 && (
        <p className="text-muted small">
          No prescriptions are recorded for this patient.
        </p>
      )}
      {data && data.medications.length > 0 && (
        <div className="table-responsive mb-2">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Medication</th>
                <th>Dose / route</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.medications.map((med) => (
                <tr key={med.prescriptionId}>
                  <td>{med.drug || 'Unnamed medication'}</td>
                  <td className="text-muted">
                    {[med.dosage, med.route].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td>
                    {med.active ? (
                      <select
                        aria-label={`Reconciliation status for ${
                          med.drug || med.prescriptionId
                        }`}
                        className="form-select form-select-sm"
                        value={statuses[med.prescriptionId] ?? 'not_reviewed'}
                        onChange={(event) =>
                          setStatuses((current) => ({
                            ...current,
                            [med.prescriptionId]: event.target.value,
                          }))
                        }
                      >
                        <option value="not_reviewed">Not reviewed</option>
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary-emphasis">
                        inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canDocument && data && data.medications.some((med) => med.active) && (
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label" htmlFor="stroke-reconcile-signer">
              Signed by
            </label>
            <input
              id="stroke-reconcile-signer"
              className="form-control form-control-sm"
              value={signedByName}
              onChange={(event) => setSignedByName(event.target.value)}
            />
          </div>
          <div className="col-md-5">
            <div className="form-check">
              <input
                id="stroke-reconcile-confirm"
                type="checkbox"
                className="form-check-input"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <label
                className="form-check-label small"
                htmlFor="stroke-reconcile-confirm"
              >
                I reviewed every active medication.
              </label>
            </div>
            {!complete && (
              <div className="small text-danger">
                Every active medication needs a status.
              </div>
            )}
          </div>
          <div className="col-md-3">
            <button
              type="button"
              className="btn btn-sm btn-primary w-100"
              disabled={save.isPending || !complete}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Saving…' : 'Sign reconciliation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
