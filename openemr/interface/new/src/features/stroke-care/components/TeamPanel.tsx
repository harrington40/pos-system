import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acknowledgeStrokeTeam,
  assignStrokeTeamMember,
  listStrokeTeam,
} from '../../../api/endpoints/strokeCare';
import { formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  activationId: number;
  canDocument: boolean;
  isAdmin: boolean;
  onChanged: () => void;
}

const TEAM_ROLES = [
  'physician',
  'neurologist',
  'nurse',
  'radiologist',
  'pharmacist',
  'therapist',
  'other',
];

/** Module C: assigned alert team and explicit acknowledgment tracking. */
export default function TeamPanel({
  activationId,
  canDocument,
  isAdmin,
  onChanged,
}: Props) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [teamRole, setTeamRole] = useState('physician');
  const [error, setError] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['stroke-team', activationId],
    queryFn: () => listStrokeTeam(activationId),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['stroke-team', activationId] });
    qc.invalidateQueries({ queryKey: ['stroke-detail', activationId] });
    qc.invalidateQueries({ queryKey: ['stroke-emergency'] });
    onChanged();
  };

  const assign = useMutation({
    mutationFn: () =>
      assignStrokeTeamMember(activationId, {
        userId: Number(userId),
        teamRole,
      }),
    onSuccess: () => {
      setUserId('');
      setError('');
      refresh();
    },
    onError: (e) => setError(apiErrorMessage(e, 'Could not assign the team member')),
  });

  const acknowledge = useMutation({
    mutationFn: (memberId?: number) =>
      acknowledgeStrokeTeam(activationId, memberId),
    onSuccess: refresh,
    onError: (e) =>
      setError(apiErrorMessage(e, 'Could not acknowledge the assignment')),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!userId.trim()) {
      setError('Enter the team member user id.');
      return;
    }
    assign.mutate();
  };

  if (isLoading) return <p className="text-muted small">Loading team…</p>;

  return (
    <div>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {canDocument && (
        <form className="row g-2 align-items-end mb-3" onSubmit={submit}>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="team-user">
              User id
            </label>
            <input
              id="team-user"
              className="form-control form-control-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="team-role">
              Team role
            </label>
            <select
              id="team-role"
              className="form-select form-select-sm"
              value={teamRole}
              onChange={(e) => setTeamRole(e.target.value)}
            >
              {TEAM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3 d-grid">
            <button
              className="btn btn-sm btn-primary"
              type="submit"
              disabled={assign.isPending}
            >
              Assign team member
            </button>
          </div>
        </form>
      )}

      {canDocument && !isAdmin && data.some((member) => !member.acknowledged_at) && (
        <button
          className="btn btn-sm btn-outline-success mb-2"
          onClick={() => acknowledge.mutate(undefined)}
          disabled={acknowledge.isPending}
        >
          Acknowledge my assignment
        </button>
      )}

      {data.length === 0 ? (
        <p className="text-muted small">
          No team assigned. Assign the responsible clinician, nurse and
          specialists so acknowledgments can be tracked.
        </p>
      ) : (
        <ul className="list-group list-group-flush small">
          {data.map((member) => {
            const canAck =
              canDocument && isAdmin && !member.acknowledged_at;
            return (
              <li
                key={member.id}
                className="list-group-item px-0 d-flex justify-content-between align-items-start"
              >
                <div>
                  <span className="fw-semibold text-capitalize">
                    {member.team_role.replace('_', ' ')}
                  </span>{' '}
                  · {[member.fname, member.lname].filter(Boolean).join(' ') || `User ${member.user_id}`}
                  <div className="text-muted">
                    Assigned {formatWhen(member.assigned_at)}
                    {member.acknowledged_at
                      ? ` · acknowledged ${formatWhen(member.acknowledged_at)}`
                      : ' · awaiting acknowledgment'}
                    {member.escalation_level > 0
                      ? ` · escalation level ${member.escalation_level}`
                      : ''}
                  </div>
                </div>
                {canAck && (
                  <button
                    className="btn btn-sm btn-outline-success"
                    onClick={() => acknowledge.mutate(member.id)}
                    disabled={acknowledge.isPending}
                  >
                    Acknowledge
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
