import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getStrokeActivation,
  getStrokeAssessmentFhir,
  getStrokeTimeline,
  type ProtocolCatalogue,
  type StrokeAssessment,
} from '../../../api/endpoints/strokeCare';
import { formatMinutes, formatWhen, severityBadge, severityLabel } from '../nihss';
import NihssForm from './NihssForm';
import NihssTrendPanel from './NihssTrendPanel';
import EncounterProfilePanel from './EncounterProfilePanel';
import OrderPanel from './OrderPanel';
import DecisionPanel from './DecisionPanel';
import ImagingPanel from './ImagingPanel';
import StrokeFollowUpPanel from './StrokeFollowUpPanel';
import TeamPanel from './TeamPanel';
import ClinicalTimelinePanel from './ClinicalTimelinePanel';
import TreatmentPanel from './TreatmentPanel';
import InpatientPanel from './InpatientPanel';
import RehabClinicPanel from './RehabClinicPanel';
import CloseAlertButton from './CloseAlertButton';

interface Props {
  activationId: number;
  protocols: ProtocolCatalogue;
  role: string | undefined;
  onChanged: () => void;
}

type DetailTab =
  | 'encounter'
  | 'assessment'
  | 'orders'
  | 'decision'
  | 'treatment'
  | 'imaging'
  | 'inpatient'
  | 'rehab-clinic'
  | 'team'
  | 'clinical-timeline'
  | 'coordination'
  | 'audit';

const TABS: Array<{ key: DetailTab; label: string; icon: string }> = [
  { key: 'encounter', label: 'Encounter', icon: 'bi-person-vcard' },
  { key: 'assessment', label: 'NIHSS', icon: 'bi-clipboard2-pulse' },
  { key: 'orders', label: 'Order sets', icon: 'bi-list-check' },
  { key: 'decision', label: 'Reperfusion', icon: 'bi-shield-plus' },
  { key: 'treatment', label: 'Treatment', icon: 'bi-capsule' },
  { key: 'imaging', label: 'Imaging', icon: 'bi-image' },
  { key: 'inpatient', label: 'Inpatient', icon: 'bi-hospital' },
  { key: 'rehab-clinic', label: 'Rehab / clinic', icon: 'bi-heart-pulse' },
  { key: 'team', label: 'Team', icon: 'bi-people-fill' },
  { key: 'clinical-timeline', label: 'Timeline', icon: 'bi-clock-history' },
  { key: 'coordination', label: 'Coordination', icon: 'bi-diagram-3' },
  { key: 'audit', label: 'Audit', icon: 'bi-journal-text' },
];

/**
 * The unified stroke record for one activation. Every clinical write in this
 * panel requires a role with documented permission *and* an explicit sign-off;
 * the panel never asserts a diagnosis or a treatment on its own.
 */
export default function StrokeDetail({
  activationId,
  protocols,
  role,
  onChanged,
}: Props) {
  const [tab, setTab] = useState<DetailTab>('encounter');
  const [editingDraft, setEditingDraft] = useState<StrokeAssessment | null>(null);
  const [amending, setAmending] = useState<StrokeAssessment | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['stroke-detail', activationId],
    queryFn: () => getStrokeActivation(activationId),
    refetchInterval: 20000,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['stroke-timeline', activationId],
    queryFn: () => getStrokeTimeline(activationId),
    enabled: tab === 'audit',
  });

  const canDocument = ['admin', 'physician', 'nurse', 'registered_nurse'].includes(
    role || '',
  );
  const canDecide = ['admin', 'physician'].includes(role || '');

  const downloadFhir = async (assessmentId: number) => {
    const bundle = await getStrokeAssessmentFhir(assessmentId);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/fhir+json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nihss-${assessmentId}.fhir.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="text-muted small p-3">Loading stroke record…</div>;
  }
  if (error || !data) {
    return (
      <div className="alert alert-danger small">
        The stroke record could not be loaded.
      </div>
    );
  }

  const a = data.activation;
  const latest = data.assessments.find((entry) => entry.status === 'finalized');

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <div className="fw-bold">
            <i className="bi bi-activity text-danger me-2"></i>
            {a.fname} {a.lname}
          </div>
          <div className="small text-muted">
            {a.activation_code} · patient {a.pid} ·{' '}
            <span className="text-capitalize">{a.care_setting}</span> ·{' '}
            <span className="text-capitalize">
              {String(a.stroke_type).replace('_', ' ')}
            </span>
            {a.laterality ? ` · ${a.laterality}` : ''}
          </div>
        </div>
        <div className="text-end">
          <span className="badge bg-primary-subtle text-primary-emphasis me-1">
            {a.status.replace('_', ' ')}
          </span>
          {latest && (
            <span className={`badge ${severityBadge(latest.severity)}`}>
              NIHSS {latest.total_score} · {severityLabel(latest.severity)}
            </span>
          )}
          {a.closed_at && (
            <div className="small text-muted mt-1">
              Closed {formatWhen(a.closed_at)} · {a.outcome}
            </div>
          )}
        </div>
      </div>

      <div className="card-body">
        {!a.closed_at && (
          <div className="d-flex justify-content-end mb-2">
            <CloseAlertButton
              activationId={activationId}
              canClose={canDecide}
              onClosed={onChanged}
            />
          </div>
        )}
        <div className="row g-2 mb-3">
          {[
            ['Arrival', formatWhen(a.arrival_at)],
            ['Last known well', formatWhen(a.lkw_at)],
            ['Door → CT', formatMinutes(a.door_to_ct_minutes as number | null)],
            [
              'Door → needle',
              formatMinutes(a.door_to_needle_minutes as number | null),
            ],
            ['Thrombolysis', a.tpa_status || 'not recorded'],
            ['Thrombectomy', a.thrombectomy_status || 'not recorded'],
          ].map(([label, value]) => (
            <div className="col-6 col-md-2" key={String(label)}>
              <div className="border rounded p-2 h-100">
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                  {label}
                </div>
                <div className="fw-semibold small">{value}</div>
              </div>
            </div>
          ))}
        </div>

        <ul className="nav nav-pills nav-fill small mb-3">
          {TABS.map((entry) => (
            <li className="nav-item" key={entry.key}>
              <button
                type="button"
                className={`nav-link py-1 ${tab === entry.key ? 'active' : ''}`}
                onClick={() => setTab(entry.key)}
              >
                <i className={`bi ${entry.icon} me-1`}></i>
                {entry.label}
              </button>
            </li>
          ))}
        </ul>

        {tab === 'encounter' && (
          <EncounterProfilePanel
            activationId={activationId}
            canDocument={canDocument}
            onChanged={onChanged}
          />
        )}

        {tab === 'assessment' && (
          <div>
            {editingDraft || amending ? (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="small fw-semibold text-uppercase text-muted mb-0">
                    {amending ? 'Amend assessment' : 'Edit draft'}
                  </h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-link"
                    onClick={() => {
                      setEditingDraft(null);
                      setAmending(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <NihssForm
                  activationId={activationId}
                  definitions={protocols.nihss.items}
                  untestableKeys={protocols.nihss.untestableKeys}
                  canDocument={canDocument}
                  existing={amending ?? editingDraft}
                  amendMode={Boolean(amending)}
                  onSaved={() => {
                    setEditingDraft(null);
                    setAmending(null);
                    onChanged();
                  }}
                />
              </div>
            ) : (
              <NihssForm
                activationId={activationId}
                definitions={protocols.nihss.items}
                untestableKeys={protocols.nihss.untestableKeys}
                canDocument={canDocument}
                onSaved={onChanged}
              />
            )}

            <h6 className="small fw-semibold text-uppercase text-muted mt-3">
              Assessment history
            </h6>
            {data.assessments.length === 0 ? (
              <p className="text-muted small mb-0">
                No NIHSS has been recorded for this activation.
              </p>
            ) : (
              <ul className="list-group list-group-flush small">
                {data.assessments.map((entry) => {
                  const untestableCount = Object.keys(
                    entry.untestable ?? {},
                  ).filter((key) => entry.untestable[key]).length;
                  return (
                    <li key={entry.id} className="list-group-item px-0">
                      <div className="d-flex justify-content-between flex-wrap gap-2">
                        <span className="fw-semibold">
                          <span
                            className={`badge me-2 ${
                              entry.status === 'draft'
                                ? 'bg-secondary'
                                : 'bg-success-subtle text-success'
                            }`}
                          >
                            {entry.status}
                          </span>
                          NIHSS {entry.total_score} ·{' '}
                          {severityLabel(entry.severity)} · v{entry.version}
                        </span>
                        <span className="text-muted">
                          {formatWhen(entry.assessed_at)}
                        </span>
                      </div>
                      <div className="text-muted">
                        {entry.status === 'finalized'
                          ? `Finalized by ${entry.finalized_by_name || entry.signed_by_name}`
                          : `Draft by ${entry.assessed_by_name || 'clinician'}`}{' '}
                        · protocol v{entry.protocol_version}
                        {entry.amends_id
                          ? ` · amends #${entry.amends_id}: ${entry.amendment_reason || ''}`
                          : ''}
                        {untestableCount > 0
                          ? ` · ${untestableCount} untestable item(s) not scored`
                          : ''}
                      </div>
                      {entry.notes && <div>{entry.notes}</div>}
                      <div className="d-flex gap-2 mt-1">
                        {canDocument && entry.status === 'draft' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                              setAmending(null);
                              setEditingDraft(entry);
                            }}
                          >
                            Edit draft
                          </button>
                        )}
                        {canDocument && entry.status === 'finalized' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => {
                              setEditingDraft(null);
                              setAmending(entry);
                            }}
                          >
                            Amend
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => downloadFhir(entry.id)}
                        >
                          FHIR
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <hr />
            <NihssTrendPanel pid={a.pid} />
          </div>
        )}

        {tab === 'orders' && (
          <OrderPanel
            activationId={activationId}
            orderSets={protocols.acute.orderSets}
            orders={data.orders}
            canOrder={canDecide}
            onChanged={onChanged}
          />
        )}

        {tab === 'decision' && (
          <DecisionPanel
            activationId={activationId}
            criteria={data.criteria}
            decisions={data.decisions}
            canDecide={canDecide}
            onChanged={onChanged}
          />
        )}

        {tab === 'treatment' && (
          <TreatmentPanel
            activationId={activationId}
            canDocument={canDocument}
            onChanged={onChanged}
          />
        )}

        {tab === 'team' && (
          <TeamPanel
            activationId={activationId}
            canDocument={canDocument}
            isAdmin={role === 'admin'}
            onChanged={onChanged}
          />
        )}

        {tab === 'clinical-timeline' && (
          <ClinicalTimelinePanel
            activationId={activationId}
            canDocument={canDocument}
            onChanged={onChanged}
          />
        )}

        {tab === 'imaging' && (
          <ImagingPanel
            activationId={activationId}
            imaging={data.imaging}
            canDocument={canDocument || role === 'lab_tech'}
            onChanged={onChanged}
          />
        )}

        {tab === 'inpatient' && (
          <InpatientPanel
            activationId={activationId}
            canDocument={canDocument}
            onChanged={onChanged}
          />
        )}

        {tab === 'rehab-clinic' && (
          <RehabClinicPanel
            pid={a.pid}
            activationId={activationId}
            canDocument={canDocument}
            onChanged={onChanged}
          />
        )}

        {tab === 'coordination' && (
          <StrokeFollowUpPanel
            pid={a.pid}
            activationId={activationId}
            facilityId={Number(a.facility_id) || 0}
            tasks={data.tasks}
            transfers={data.transfers}
            canDocument={canDocument}
            onChanged={onChanged}
          />
        )}

        {tab === 'audit' && (
          <div>
            {timeline.length === 0 ? (
              <p className="text-muted small mb-0">
                No audit entries recorded yet.
              </p>
            ) : (
              <ul className="list-group list-group-flush small">
                {timeline.map((event) => (
                  <li key={event.id} className="list-group-item px-0">
                    <div className="d-flex justify-content-between">
                      <span className="fw-semibold text-capitalize">
                        {event.entity_type.replace(/_/g, ' ')} · {event.action}
                      </span>
                      <span className="text-muted">
                        {formatWhen(event.created_at)}
                      </span>
                    </div>
                    <div className="text-muted">
                      {event.actor_name || 'system'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
