import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStrokeTask,
  completeStrokeFollowUp,
  getStrokePatientRecord,
  requestStrokeTransfer,
  scheduleStrokeFollowUp,
  updateStrokeTask,
  type StrokeFollowUp,
  type StrokeTask,
  type StrokeTransfer,
} from '../../../api/endpoints/strokeCare';
import { formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  pid: number;
  activationId: number;
  facilityId: number;
  tasks: StrokeTask[];
  transfers: StrokeTransfer[];
  canDocument: boolean;
  onChanged: () => void;
}

/**
 * Post-stroke coordination: multidisciplinary tasks, follow-up appointments and
 * inter-facility transfer requests. None of these writes a clinical diagnosis;
 * they organise the work around the patient's existing record.
 */
export default function StrokeFollowUpPanel({
  pid,
  activationId,
  facilityId,
  tasks,
  transfers,
  canDocument,
  onChanged,
}: Props) {
  const qc = useQueryClient();
  const [discipline, setDiscipline] = useState('physiotherapy');
  const [task, setTask] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [visitType, setVisitType] = useState('stroke_clinic');
  const [toFacilityId, setToFacilityId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [error, setError] = useState('');

  const { data: patientRecord } = useQuery({
    queryKey: ['stroke-patient', pid],
    queryFn: () => getStrokePatientRecord(pid),
    enabled: Number.isInteger(pid) && pid > 0,
  });

  const followUps: StrokeFollowUp[] = patientRecord?.followUps ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['stroke-patient', pid] });
    onChanged();
  };

  const addTask = useMutation({
    mutationFn: () =>
      addStrokeTask(pid, {
        discipline,
        task: task.trim(),
      }),
    onSuccess: () => {
      setTask('');
      setError('');
      refresh();
    },
    onError: (e) => setError(apiErrorMessage(e, 'Could not add the task')),
  });

  const completeTask = useMutation({
    mutationFn: (id: number) => updateStrokeTask(id, 'completed'),
    onSuccess: refresh,
  });

  const addFollowUp = useMutation({
    mutationFn: () =>
      scheduleStrokeFollowUp(pid, {
        dueDate,
        visitType,
      }),
    onSuccess: () => {
      setDueDate('');
      setError('');
      refresh();
    },
    onError: (e) =>
      setError(apiErrorMessage(e, 'Could not schedule follow-up')),
  });

  const completeVisit = useMutation({
    mutationFn: (id: number) => completeStrokeFollowUp(id),
    onSuccess: refresh,
  });

  const transfer = useMutation({
    mutationFn: () =>
      requestStrokeTransfer(activationId, {
        toFacilityId: Number(toFacilityId),
        reason: transferReason.trim() || undefined,
      }),
    onSuccess: () => {
      setToFacilityId('');
      setTransferReason('');
      setError('');
      onChanged();
    },
    onError: (e) =>
      setError(apiErrorMessage(e, 'Could not request the transfer')),
  });

  const submitTask = (event: FormEvent) => {
    event.preventDefault();
    if (!task.trim()) return;
    addTask.mutate();
  };

  const submitFollowUp = (event: FormEvent) => {
    event.preventDefault();
    if (!dueDate) {
      setError('Choose a follow-up date.');
      return;
    }
    addFollowUp.mutate();
  };

  const submitTransfer = (event: FormEvent) => {
    event.preventDefault();
    if (!toFacilityId.trim()) {
      setError('Enter the receiving facility id.');
      return;
    }
    transfer.mutate();
  };

  return (
    <div>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <h6 className="small fw-semibold text-uppercase text-muted">
        Care-team tasks
      </h6>
      {canDocument && (
        <form className="row g-2 align-items-end mb-2" onSubmit={submitTask}>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="task-discipline">
              Discipline
            </label>
            <select
              id="task-discipline"
              className="form-select form-select-sm"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
            >
              <option value="physiotherapy">Physiotherapy</option>
              <option value="occupational_therapy">Occupational therapy</option>
              <option value="speech_therapy">Speech therapy</option>
              <option value="nursing">Nursing</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="social_work">Social work</option>
              <option value="dietetics">Dietetics</option>
            </select>
          </div>
          <div className="col-md-7">
            <label className="form-label small fw-semibold" htmlFor="task-text">
              Task
            </label>
            <input
              id="task-text"
              className="form-control form-control-sm"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Assess swallow and mobility"
            />
          </div>
          <div className="col-md-2 d-grid">
            <button
              className="btn btn-sm btn-outline-primary"
              type="submit"
              disabled={addTask.isPending}
            >
              Add task
            </button>
          </div>
        </form>
      )}
      {tasks.length === 0 ? (
        <p className="text-muted small">No care-team tasks.</p>
      ) : (
        <ul className="list-group list-group-flush small mb-3">
          {tasks.map((entry) => (
            <li
              key={entry.id}
              className="list-group-item px-0 d-flex justify-content-between align-items-start"
            >
              <div>
                <span className="fw-semibold text-capitalize">
                  {entry.discipline.replace('_', ' ')}
                </span>
                <div>{entry.task}</div>
                <div className="text-muted">
                  {entry.status.replace('_', ' ')}
                  {entry.completed_by_name
                    ? ` · ${entry.completed_by_name}`
                    : ''}
                </div>
              </div>
              {canDocument && entry.status !== 'completed' && (
                <button
                  className="btn btn-sm btn-outline-success"
                  onClick={() => completeTask.mutate(entry.id)}
                  disabled={completeTask.isPending}
                >
                  Complete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h6 className="small fw-semibold text-uppercase text-muted">
        Follow-up appointments
      </h6>
      {canDocument && (
        <form className="row g-2 align-items-end mb-2" onSubmit={submitFollowUp}>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="fu-date">
              Due date
            </label>
            <input
              id="fu-date"
              type="date"
              className="form-control form-control-sm"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-semibold" htmlFor="fu-type">
              Visit type
            </label>
            <select
              id="fu-type"
              className="form-select form-select-sm"
              value={visitType}
              onChange={(e) => setVisitType(e.target.value)}
            >
              <option value="stroke_clinic">Stroke clinic</option>
              <option value="rehabilitation">Rehabilitation review</option>
              <option value="primary_care">Primary care</option>
              <option value="imaging">Follow-up imaging</option>
            </select>
          </div>
          <div className="col-md-3 d-grid">
            <button
              className="btn btn-sm btn-outline-primary"
              type="submit"
              disabled={addFollowUp.isPending}
            >
              Schedule follow-up
            </button>
          </div>
        </form>
      )}
      {followUps.length === 0 ? (
        <p className="text-muted small">No follow-up scheduled.</p>
      ) : (
        <ul className="list-group list-group-flush small mb-3">
          {followUps.map((entry) => (
            <li
              key={entry.id}
              className="list-group-item px-0 d-flex justify-content-between align-items-start"
            >
              <div>
                <span className="fw-semibold">{entry.due_date}</span> ·{' '}
                {entry.visit_type.replace('_', ' ')}
                <div className="text-muted">
                  {entry.status}
                  {entry.completed_at
                    ? ` · ${formatWhen(entry.completed_at)}`
                    : ''}
                </div>
              </div>
              {canDocument && entry.status === 'scheduled' && (
                <button
                  className="btn btn-sm btn-outline-success"
                  onClick={() => completeVisit.mutate(entry.id)}
                  disabled={completeVisit.isPending}
                >
                  Complete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h6 className="small fw-semibold text-uppercase text-muted">
        Inter-facility transfer
      </h6>
      {canDocument && (
        <form className="row g-2 align-items-end mb-2" onSubmit={submitTransfer}>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="tr-facility">
              Receiving facility id
            </label>
            <input
              id="tr-facility"
              className="form-control form-control-sm"
              value={toFacilityId}
              onChange={(e) => setToFacilityId(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="col-md-5">
            <label className="form-label small fw-semibold" htmlFor="tr-reason">
              Reason
            </label>
            <input
              id="tr-reason"
              className="form-control form-control-sm"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
            />
          </div>
          <div className="col-md-3 d-grid">
            <button
              className="btn btn-sm btn-outline-secondary"
              type="submit"
              disabled={
                transfer.isPending || Number(toFacilityId) === facilityId
              }
            >
              Request transfer
            </button>
          </div>
        </form>
      )}
      {transfers.length === 0 ? (
        <p className="text-muted small mb-0">No transfer requested.</p>
      ) : (
        <ul className="list-group list-group-flush small">
          {transfers.map((entry) => (
            <li key={entry.id} className="list-group-item px-0">
              <span className="fw-semibold">
                Facility {entry.from_facility_id ?? '—'} → {entry.to_facility_id}
              </span>
              <div className="text-muted">
                {entry.status} · {formatWhen(entry.created_at)}
                {entry.reason ? ` · ${entry.reason}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
