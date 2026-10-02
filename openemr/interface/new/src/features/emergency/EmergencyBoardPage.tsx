import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import nestClient from '../../api/nest-client';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime } from '../../utils/date';

/**
 * Emergency patient dashboard — the live triage board.
 *
 * Backed by GET /emergency/board (sickest + most overdue first). Colours, target
 * times, breach flags and reassessment countdowns all come from the backend's
 * decorate(), so the board and the API can never disagree.
 */

const ACTIVE_STATUSES = ['waiting', 'in_treatment', 'observation'];
const CLOSED_STATUSES = ['admitted', 'discharged', 'transferred', 'lwbs', 'deceased'];

const statusMeta: Record<string, { label: string; color: string }> = {
  waiting: { label: 'Waiting', color: 'bg-warning text-dark' },
  in_treatment: { label: 'In treatment', color: 'bg-primary' },
  observation: { label: 'Observation', color: 'bg-info text-dark' },
  admitted: { label: 'Admitted', color: 'bg-success' },
  discharged: { label: 'Discharged', color: 'bg-secondary' },
  transferred: { label: 'Transferred', color: 'bg-secondary' },
  lwbs: { label: 'Left without being seen', color: 'bg-dark' },
  deceased: { label: 'Deceased', color: 'bg-dark' },
};

const waitText = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

export default function EmergencyBoardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [notice, setNotice] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'physician';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['emergency-board'],
    queryFn: async () => (await nestClient.get('/emergency/board')).data,
    refetchInterval: 15000,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      nestClient.patch(`/emergency/visits/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-board'] });
    },
    onError: (e: any) =>
      setNotice(e?.response?.data?.message || 'Could not update the visit.'),
  });

  const escalateOverdue = useMutation({
    mutationFn: () => nestClient.post('/emergency/escalate-overdue'),
    onSuccess: (r: any) => {
      const d = r?.data || {};
      setNotice(
        `Sweep complete — ${d.escalated ?? 0} escalated, ${d.reassessPages ?? 0} reassessment chase(s).`,
      );
      qc.invalidateQueries({ queryKey: ['emergency-board'] });
    },
    onError: () => setNotice('Escalation sweep failed.'),
  });

  const counts = data?.counts || {};
  const allVisits: any[] = data?.visits || [];
  const visits = useMemo(
    () =>
      statusFilter === 'all'
        ? allVisits
        : allVisits.filter((v: any) => v.status === statusFilter),
    [allVisits, statusFilter],
  );

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div className="rounded-4 p-4 mb-4 text-white" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #fd7e14 55%, #ffc107 100%)' }}>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h2 className="mb-1 fw-bold"><i className="bi bi-activity me-2"></i>Emergency Department</h2>
            <p className="mb-0 text-white text-opacity-75 small">
              Live triage board · sickest and most overdue first · auto-refreshes every 15s
              {data?.longestWaitMinutes != null ? ` · longest wait ${waitText(data.longestWaitMinutes)}` : ''}
            </p>
          </div>
          {isAdmin && (
            <button className="btn btn-light btn-sm rounded-pill"
              onClick={() => escalateOverdue.mutate()} disabled={escalateOverdue.isPending}>
              <i className="bi bi-alarm me-1"></i>Run safety sweep
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="alert alert-info py-2 small rounded-3 d-flex align-items-center gap-2">
          <i className="bi bi-info-circle"></i>{notice}
          <button className="btn-close ms-auto" onClick={() => setNotice('')}></button>
        </div>
      )}

      {/* Counts */}
      <div className="row g-3 mb-4">
        {[
          { l: 'Active', v: counts.active, c: '#0d6efd', i: 'bi-people-fill' },
          { l: 'Waiting', v: counts.waiting, c: '#fd7e14', i: 'bi-hourglass-split' },
          { l: 'In treatment', v: counts.inTreatment, c: '#6f42c1', i: 'bi-heart-pulse' },
          { l: 'Breached', v: counts.breached, c: '#dc3545', i: 'bi-exclamation-octagon-fill' },
          { l: 'Awaiting 1st review', v: counts.awaitingFirstReview, c: '#d63384', i: 'bi-eye' },
          { l: 'Reassess overdue', v: counts.reassessOverdue, c: '#fd7e14', i: 'bi-arrow-repeat' },
          { l: 'Needs vitals', v: counts.needsVitals, c: '#20c997', i: 'bi-thermometer-half' },
          { l: 'Escalated', v: counts.escalated, c: '#dc3545', i: 'bi-arrow-up-circle-fill' },
        ].map((k, i) => (
          <div className="col-6 col-md-3" key={i}>
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
              <div className="card-body d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', backgroundColor: k.c + '18' }}>
                  <i className={`bi ${k.i} fs-5`} style={{ color: k.c }}></i>
                </div>
                <div><div className="fw-bold fs-5" style={{ color: k.c }}>{k.v ?? 0}</div><small className="text-muted">{k.l}</small></div>
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Board */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h6 className="mb-0 fw-bold small"><i className="bi bi-clipboard2-pulse me-1"></i>Patients in the department</h6>
          <div className="d-flex gap-1">
            {['all', ...ACTIVE_STATUSES].map((s) => (
              <button key={s} className={`btn btn-sm rounded-pill ${statusFilter === s ? 'btn-danger' : 'btn-outline-secondary'}`}
                onClick={() => setStatusFilter(s)}>
                {s === 'all' ? 'All' : statusMeta[s]?.label || s}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-5"><span className="spinner-border text-danger"></span></div>
          ) : isError ? (
            <div className="text-center text-muted py-5 small">Could not load the emergency board.</div>
          ) : visits.length === 0 ? (
            <div className="text-center text-muted py-5 small">
              <i className="bi bi-emoji-smile fs-3 d-block mb-2"></i>No patients in the department.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Level</th><th>Patient</th><th>Complaint</th><th>Status</th>
                    <th>Wait / target</th><th>Reassess</th><th>Flags</th><th>Room</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v: any) => (
                    <tr key={v.id} style={{ borderLeft: `5px solid ${v.color}` }}>
                      <td>
                        <span className="badge" style={{ backgroundColor: v.color, color: '#fff' }} title={v.meaning}>
                          {v.level} · {v.label}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-link p-0 text-decoration-none small fw-semibold"
                          onClick={() => navigate(`/patients/${v.pid}`)}>
                          {v.patientName || `#${v.pid}`}
                        </button>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {v.ageYears != null ? `${v.ageYears}y` : ''} {v.sex || ''} {v.patientPublicId ? `· ${v.patientPublicId}` : ''}
                        </div>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: '180px' }}>{v.chiefComplaint || '—'}</td>
                      <td>
                        <select className="form-select form-select-sm" style={{ width: '130px' }} value={v.status}
                          onChange={(e) => setStatus.mutate({ id: v.id, status: e.target.value })}>
                          {[...ACTIVE_STATUSES, ...CLOSED_STATUSES].map((s) => (
                            <option key={s} value={s}>{statusMeta[s]?.label || s}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={v.breached ? 'text-danger fw-bold' : ''}>{waitText(v.waitMinutes)}</span>
                        <span className="text-muted"> / {v.targetMinutes}m</span>
                        {v.breached && <span className="badge bg-danger ms-1">+{v.overByMinutes}m</span>}
                      </td>
                      <td>
                        {v.reassessOverdue
                          ? <span className="badge bg-danger">overdue</span>
                          : <span className="text-muted">{v.reassessDueInMinutes}m</span>}
                      </td>
                      <td>
                        {v.needsVitals && <span className="badge bg-info text-dark me-1">vitals</span>}
                        {v.awaitingFirstReview && <span className="badge bg-warning text-dark me-1">1st review</span>}
                        {v.escalatedLevel != null && <span className="badge bg-danger" title={v.escalatedReason || ''}>escalated</span>}
                      </td>
                      <td>{v.room || '—'}</td>
                      <td className="text-nowrap">
                        {v.status === 'waiting' && (
                          <button className="btn btn-sm btn-outline-primary rounded-pill me-1"
                            onClick={() => setStatus.mutate({ id: v.id, status: 'in_treatment' })}>
                            Seen
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-secondary rounded-pill"
                          onClick={() => navigate(`/patients/${v.pid}/screening`)} title="Open the patient chart">
                          Chart
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card-footer bg-white small text-muted py-2">
          {visits.length} visit{visits.length !== 1 ? 's' : ''} shown
          {data?.generatedAt ? ` · updated ${formatDateTime(data.generatedAt)}` : ''}
        </div>
      </div>
    </div>
  );
}

