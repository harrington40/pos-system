import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPatientEmergency } from '../../../api/endpoints/emergency';
import { formatDateTime } from '../../../utils/date';
import { LevelBadge, TriageLegend } from '../../emergency/components/LevelBadge';
import { emergencyBanner, waitClock } from '../../../utils/triage';

/**
 * The patient's emergency history, on the chart.
 *
 * Deliberately read-only: triage happens on the board, where the waiting room and
 * the rest of the queue are visible. Charting a level from here, one patient at a
 * time, is how two different levels end up on the same attendance.
 */
export default function EmergencyTab({ pid }: { pid: string | number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['emergency-patient', String(pid)],
    queryFn: () => getPatientEmergency(pid),
    enabled: !!pid,
  });

  if (isLoading) {
    return <div className="text-center text-muted py-5"><span className="spinner-border spinner-border-sm me-2"></span>{t('patients.tabs.emergency.loading')}</div>;
  }

  const visits = [data?.current, ...(data?.history || [])].filter(Boolean) as any[];
  const reassessments: any[] = data?.reassessments || [];
  const banner = emergencyBanner(data);

  if (!visits.length) {
    return (
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="card-body text-center text-muted py-5">
          <i className="bi bi-clipboard2-pulse fs-1 d-block mb-2 opacity-50"></i>
          <p className="mb-0">{t('patients.tabs.emergency.none')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {/* This tab reads; the board writes. Say so, and offer the way there, so a
          read-only tab does not read as a broken one. */}
      <div className="alert alert-light border mb-0 d-flex flex-wrap align-items-center gap-2 py-2">
        <i className="bi bi-info-circle text-secondary"></i>
        <span className="small text-muted">
          {t('patients.tabs.emergency.notice')}
        </span>
        <button className="btn btn-sm btn-outline-danger rounded-pill ms-auto"
          onClick={() => navigate('/emergency')}>
          <i className="bi bi-clipboard2-pulse me-1"></i>{t('patients.tabs.emergency.openBoard')}
        </button>
      </div>

      {banner && (
        <div className="alert mb-0" style={{ borderLeft: `6px solid ${banner.color}`, background: `${banner.color}14` }}>
          <div className="fw-semibold">{banner.headline}</div>
          <div className="small text-muted">{banner.detail}</div>
          <div className="small fw-semibold mt-1">{banner.action}</div>
        </div>
      )}

      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3" style={{ borderRadius: '16px 16px 0 0' }}>
          <span className="fw-bold"><i className="bi bi-clock-history me-2 text-danger"></i>{t('patients.tabs.emergency.attendances')}</span>
          <TriageLegend compact />
        </div>
        <div className="card-body p-0">
          {visits.map((visit: any) => {
            const clock = waitClock(visit);
            return (
              <div key={visit.id} className="border-bottom px-3 py-3" style={{ borderLeft: `6px solid ${visit.color}` }}>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <LevelBadge level={visit.level} />
                  <strong className="small">{formatDateTime(visit.arrivedAt)}</strong>
                  <span className="badge bg-light text-secondary">{visit.mode}</span>
                  <span className="badge bg-light text-secondary">{visit.status}</span>
                  {visit.disposition && <span className="badge bg-light text-secondary">{visit.disposition}</span>}
                  {visit.escalatedLevel !== null && <span className="badge bg-danger-subtle text-danger">{t('emergency.escalatedForDelay')}</span>}
                </div>
                <div className="small text-muted mb-1">{visit.chiefComplaint || t('emergency.noComplaint')}</div>
                <div className="small text-muted">
                  {t('patients.tabs.emergency.waited', {
                    elapsed: clock.text,
                    target: visit.targetMinutes === 0 ? t('emergency.target.immediate') : t('emergency.target.minutes', { count: visit.targetMinutes }),
                  })}
                  {visit.doorToProviderMinutes !== null ? t('patients.tabs.emergency.seenAfter', { count: visit.doorToProviderMinutes }) : ''}
                  {visit.news2 ? ` · NEWS2 ${visit.news2}` : ''}
                  {visit.needsVitals ? t('patients.tabs.emergency.obsIncomplete') : ''}
                </div>
                {visit.reasons?.length > 0 && (
                  <ul className="small text-muted mb-0 mt-1 ps-3">
                    {visit.reasons.map((reason: string, i: number) => <li key={i}>{reason}</li>)}
                  </ul>
                )}
                {visit.escalatedReason && (
                  <div className="small mt-1" style={{ color: '#dc3545' }}>
                    <i className="bi bi-arrow-up-circle me-1"></i>{visit.escalatedReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white py-3" style={{ borderRadius: '16px 16px 0 0' }}>
          <span className="fw-bold"><i className="bi bi-arrow-repeat me-2 text-primary"></i>{t('patients.tabs.emergency.reassessmentTrail')}</span>
        </div>
        <div className="card-body p-0">
          {reassessments.length === 0 && (
            <div className="text-muted small p-3">{t('patients.tabs.emergency.noReassess')}</div>
          )}
          {reassessments.map((entry: any) => {
            const raised = entry.levelAfter < entry.levelBefore;
            const lowered = entry.levelAfter > entry.levelBefore;
            return (
              <div key={entry.id} className="border-bottom px-3 py-2">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <LevelBadge level={entry.levelBefore} size="sm" showLabel={false} />
                  <i className={`bi ${raised ? 'bi-arrow-up' : lowered ? 'bi-arrow-down' : 'bi-dash'} text-muted`}></i>
                  <LevelBadge level={entry.levelAfter} size="sm" showLabel={false} />
                  <span className={`badge ${raised ? 'bg-danger' : lowered ? 'bg-warning text-dark' : 'bg-light text-secondary'}`}>
                    {raised ? t('patients.tabs.emergency.escalated') : lowered ? t('patients.tabs.emergency.deEscalated') : t('patients.tabs.emergency.unchanged')}
                  </span>
                  {entry.kind === 'escalation' && (
                    <span className="badge bg-light text-secondary" title={t('patients.tabs.emergency.waitingTimeCheckHint')}>
                      {t('patients.tabs.emergency.waitingTimeCheck')}
                    </span>
                  )}
                  <small className="text-muted ms-auto">{formatDateTime(entry.at)}</small>
                </div>
                {entry.note && <div className="small text-muted mt-1">{entry.note}</div>}
                <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                  {entry.by || t('patients.common.unknown')} · NEWS2 {entry.news2}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

