import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acknowledgeStrokeNotification,
  acknowledgeStrokeTeam,
  getEmergencyDashboard,
  listStrokeNotifications,
  runStrokeNotificationSweep,
} from '../../../api/endpoints/strokeCare';
import { formatWhen, severityBadge, severityLabel } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  facilityId: number | null;
  canAcknowledge: boolean;
  isAdmin: boolean;
  currentUserId: number | undefined;
  onOpen: (activationId: number) => void;
}

/** Module C: active stroke alerts, acknowledgments, tasks and notifications. */
export default function EmergencyBoard({
  facilityId,
  canAcknowledge,
  isAdmin,
  currentUserId,
  onOpen,
}: Props) {
  const qc = useQueryClient();
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['stroke-emergency', facilityId],
    queryFn: () => getEmergencyDashboard(facilityId),
    refetchInterval: 15000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['stroke-notifications'],
    queryFn: listStrokeNotifications,
    refetchInterval: 10000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['stroke-emergency', facilityId] });
    qc.invalidateQueries({ queryKey: ['stroke-notifications'] });
  };

  const ackTeam = useMutation({
    mutationFn: ({ activationId, memberId }: { activationId: number; memberId: number }) =>
      acknowledgeStrokeTeam(activationId, memberId),
    onSuccess: refresh,
  });

  const ackNotification = useMutation({
    mutationFn: (id: number) => acknowledgeStrokeNotification(id),
    onSuccess: refresh,
  });

  const sweep = useMutation({
    mutationFn: runStrokeNotificationSweep,
    onSuccess: refresh,
    onError: (e) => window.alert(apiErrorMessage(e, 'Could not run the sweep')),
  });

  if (isLoading) return <p className="text-muted small">Loading emergency board…</p>;
  if (error || !data) {
    return <p className="text-danger small">The emergency board could not be loaded.</p>;
  }

  return (
    <div>
      <div className="row g-2 mb-3">
        {[
          ['Active alerts', data.summary.activeAlerts, 'text-danger'],
          ['Unassigned', data.summary.unassignedAlerts, 'text-warning'],
          ['Pending acks', data.summary.pendingAcknowledgments, 'text-primary'],
          ['Notifications', data.summary.pendingNotifications, 'text-info'],
          ['Open tasks', data.summary.openTasks, 'text-secondary'],
        ].map(([label, value, tone]) => (
          <div className="col-6 col-md-2" key={String(label)}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body py-2">
                <div className="text-muted small">{label}</div>
                <div className={`fs-4 fw-bold ${tone}`}>{value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold d-flex justify-content-between align-items-center">
              <span>Active stroke alerts</span>
              <span className="text-muted small">{formatWhen(data.generatedAt)}</span>
            </div>
            <div className="card-body p-0">
              {data.alerts.length === 0 ? (
                <p className="p-3 text-muted small mb-0">No active stroke alert.</p>
              ) : (
                data.alerts.map((alert) => (
                  <div key={alert.id} className="border-bottom p-3">
                    <div className="d-flex justify-content-between flex-wrap gap-2">
                      <div>
                        <div className="fw-bold">
                          {alert.patientName} <span className="text-muted small">pid {alert.pid}</span>
                        </div>
                        <div className="small text-muted">
                          {alert.activationCode} · {alert.pathway} · {alert.status.replace('_', ' ')}
                          {alert.activatedAt ? ` · activated ${formatWhen(alert.activatedAt)}` : ''}
                        </div>
                      </div>
                      <div className="text-end">
                        {alert.nihss ? (
                          <span className={`badge ${severityBadge(alert.nihss.severity)} me-1`}>
                            NIHSS {alert.nihss.total} · {severityLabel(alert.nihss.severity)}
                          </span>
                        ) : (
                          <span className="badge bg-secondary me-1">NIHSS pending</span>
                        )}
                        <span className="badge bg-info-subtle text-info-emphasis">
                          {alert.imaging.count > 0
                            ? `${alert.imaging.modalities.join('/')} · ${alert.imaging.latestStatus}`
                            : 'no imaging linked'}
                        </span>
                      </div>
                    </div>

                    <div className="small mt-2">
                      <span className="fw-semibold">Team:</span>{' '}
                      {alert.team.length === 0 ? (
                        <span className="text-danger">unassigned</span>
                      ) : (
                        alert.team.map((member) => (
                          <span
                            key={member.id}
                            className={`badge me-1 ${member.acknowledgedAt ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'}`}
                          >
                            {member.role}: {member.name}
                            {member.acknowledgedAt ? ' ✓' : ' (pending)'}
                          </span>
                        ))
                      )}
                    </div>

                    {alert.tasks.length > 0 && (
                      <div className="small mt-1">
                        <span className="fw-semibold">Tasks:</span>{' '}
                        {alert.tasks.map((task) => (
                          <span key={task.id} className="badge bg-secondary-subtle text-secondary me-1">
                            {task.discipline}: {task.task}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="small mt-1 text-muted">
                      {alert.transfer
                        ? `Transfer: ${alert.transfer.status} to facility ${alert.transfer.to_facility_id}`
                        : 'No transfer requested'}
                      {` · ${alert.pendingNotifications} notification(s)`}
                    </div>

                    <div className="d-flex gap-2 mt-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => onOpen(alert.id)}>
                        Open record
                      </button>
                      {canAcknowledge &&
                        alert.team
                          .filter(
                            (member) =>
                              !member.acknowledgedAt &&
                              (isAdmin || member.userId === currentUserId),
                          )
                          .map((member) => (
                            <button
                              key={member.id}
                              className="btn btn-sm btn-outline-success"
                              onClick={() => ackTeam.mutate({ activationId: alert.id, memberId: member.id })}
                            >
                              Acknowledge {member.role}
                            </button>
                          ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold d-flex justify-content-between align-items-center">
              <span>My notifications</span>
              {isAdmin && (
                <button className="btn btn-sm btn-outline-secondary" onClick={() => sweep.mutate()} disabled={sweep.isPending}>
                  Run sweep
                </button>
              )}
            </div>
            <div className="card-body p-0" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <p className="p-3 text-muted small mb-0">No pending notification.</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="border-bottom p-2 small">
                    <div className="d-flex justify-content-between gap-2">
                      <span className="fw-semibold">{notification.title}</span>
                      <span className={`badge ${notification.severity === 'critical' ? 'bg-danger' : 'bg-secondary'}`}>
                        {notification.severity}
                      </span>
                    </div>
                    {notification.detail && <div className="text-muted">{notification.detail}</div>}
                    <div className="text-muted">
                      {formatWhen(notification.created_at)}
                      {notification.status !== 'pending' ? ` · ${notification.status}` : ''}
                      {notification.escalation_level > 0 ? ` · escalation ${notification.escalation_level}` : ''}
                    </div>
                    <button
                      className="btn btn-sm btn-outline-success mt-1"
                      onClick={() => ackNotification.mutate(notification.id)}
                      disabled={ackNotification.isPending}
                    >
                      Acknowledge
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
