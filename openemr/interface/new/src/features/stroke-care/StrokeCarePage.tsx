import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import {
  getStrokeOverview,
  getStrokeProtocols,
  getStrokeQuality,
} from '../../api/endpoints/strokeCare';
import { formatMinutes, severityBadge, severityLabel } from './nihss';
import ActivationForm from './components/ActivationForm';
import StrokeDetail from './components/StrokeDetail';
import EmergencyBoard from './components/EmergencyBoard';

type PageTab = 'board' | 'emergency' | 'activate' | 'quality' | 'protocols';

const CONTRIBUTOR_ROLES = [
  'admin',
  'physician',
  'nurse',
  'registered_nurse',
  'front_desk',
];

/**
 * OpenRx Stroke Care.
 *
 * One surface for the outpatient clinic, the acute stroke activation and the
 * comprehensive inpatient service. The board is driven by the shared patient
 * record; clinical documentation is always signed in the detail panel.
 */
export default function StrokeCarePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<PageTab>('board');
  const [facilityInput, setFacilityInput] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const facilityId = useMemo(() => {
    const n = Number(facilityInput);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [facilityInput]);

  const canContribute = CONTRIBUTOR_ROLES.includes(user?.role || '');

  const { data: protocols } = useQuery({
    queryKey: ['stroke-protocols'],
    queryFn: getStrokeProtocols,
  });

  const { data: overview, isLoading: overviewLoading, error: overviewError } =
    useQuery({
      queryKey: ['stroke-overview', facilityId],
      queryFn: () => getStrokeOverview(facilityId),
      refetchInterval: 30000,
    });

  const { data: quality } = useQuery({
    queryKey: ['stroke-quality', facilityId],
    queryFn: () => getStrokeQuality(30, facilityId),
    enabled: tab === 'quality',
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['stroke-overview'] });
    qc.invalidateQueries({ queryKey: ['stroke-detail'] });
    qc.invalidateQueries({ queryKey: ['stroke-quality'] });
  };

  const summary = overview?.summary;

  return (
    <div
      className="p-3"
      style={{
        background:
          'linear-gradient(135deg, #e8f1ff 0%, #f8fbff 45%, #eafaf4 100%)',
        borderRadius: 20,
        minHeight: '100%',
      }}
    >
      <div
        className="rounded-4 p-4 mb-3 text-white position-relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #0b4f9c 0%, #0d6efd 45%, #0aa2a2 100%)',
        }}
      >
        <div
          className="position-absolute end-0 top-0 opacity-10"
          style={{
            fontSize: '6rem',
            transform: 'rotate(10deg) translate(15px,-10px)',
          }}
        >
          <i className="bi bi-activity"></i>
        </div>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h3 className="fw-bold mb-1">
              <i className="bi bi-activity me-2"></i>
              OpenRx Stroke Care
            </h3>
            <p className="mb-0 small text-white text-opacity-75">
              Outpatient stroke clinic · Acute stroke activation · Comprehensive
              stroke centre
            </p>
            {protocols && (
              <div className="small mt-2 text-white text-opacity-75">
                Acute protocol v{protocols.acute.protocol.version} · NIHSS
                protocol v{protocols.nihss.protocol.version} · advisory only
              </div>
            )}
          </div>
          <div>
            <label className="form-label small mb-1" htmlFor="stroke-facility">
              Facility id
            </label>
            <input
              id="stroke-facility"
              className="form-control form-control-sm"
              style={{ width: 120 }}
              placeholder="All"
              value={facilityInput}
              onChange={(e) => {
                setFacilityInput(e.target.value);
                setSelectedId(null);
              }}
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      <div className="row g-2 mb-3">
        {[
          { label: 'Active', value: summary?.active ?? 0, tone: 'text-danger' },
          {
            label: 'Thrombolysis given',
            value: summary?.thrombolysisGiven ?? 0,
            tone: 'text-primary',
          },
          {
            label: 'Thrombectomy given',
            value: summary?.thrombectomyGiven ?? 0,
            tone: 'text-info',
          },
          {
            label: 'Inpatient',
            value: summary?.comprehensive ?? 0,
            tone: 'text-success',
          },
          {
            label: 'Clinic episodes',
            value: summary?.outpatient ?? 0,
            tone: 'text-secondary',
          },
          {
            label: 'Completed',
            value: summary?.completed ?? 0,
            tone: 'text-muted',
          },
        ].map((card) => (
          <div className="col-6 col-md-2" key={card.label}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body py-2">
                <div className="text-muted small">{card.label}</div>
                <div className={`fs-4 fw-bold ${card.tone}`}>{card.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ul className="nav nav-pills mb-3 small">
        {[
          { key: 'board', label: 'Stroke board', icon: 'bi-kanban' },
          {
            key: 'emergency',
            label: 'Emergency board',
            icon: 'bi-heart-pulse-fill',
          },
          {
            key: 'activate',
            label: 'New activation',
            icon: 'bi-lightning-charge',
          },
          { key: 'quality', label: 'Quality', icon: 'bi-graph-up-arrow' },
          { key: 'protocols', label: 'Protocols', icon: 'bi-journal-medical' },
        ].map((entry) => (
          <li className="nav-item" key={entry.key}>
            <button
              type="button"
              className={`nav-link py-1 ${tab === entry.key ? 'active' : ''}`}
              onClick={() => setTab(entry.key as PageTab)}
            >
              <i className={`bi ${entry.icon} me-1`}></i>
              {entry.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'board' && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white fw-semibold d-flex justify-content-between">
            <span>Activations</span>
            <span className="text-muted small">
              {overview?.recent.length ?? 0} shown
            </span>
          </div>
          <div className="card-body p-0">
            {overviewLoading && (
              <div className="p-3 text-muted small">Loading board…</div>
            )}
            {overviewError && (
              <div className="p-3 text-danger small">
                The stroke board could not be loaded.
              </div>
            )}
            {!overviewLoading &&
              !overviewError &&
              (overview?.recent.length ?? 0) === 0 && (
                <div className="p-3 text-muted small">
                  No stroke activation has been recorded for this facility.
                </div>
              )}
            {(overview?.recent.length ?? 0) > 0 && (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Patient</th>
                      <th>Code</th>
                      <th>Setting</th>
                      <th>Arrival</th>
                      <th>LKW</th>
                      <th>NIHSS</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Door → CT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview?.recent.map((row) => (
                      <tr
                        key={row.id}
                        role="button"
                        onClick={() => setSelectedId(row.id)}
                        className={selectedId === row.id ? 'table-active' : ''}
                      >
                        <td className="fw-semibold">
                          {row.fname} {row.lname}
                          <div className="text-muted">pid {row.pid}</div>
                        </td>
                        <td>{row.activation_code}</td>
                        <td className="text-capitalize">
                          {row.care_setting.replace('_', ' ')}
                        </td>
                        <td>{formatMinutes(row.minutes_since_arrival)} ago</td>
                        <td className="text-muted">
                          {row.lkw_at ? row.lkw_at.replace('T', ' ') : '—'}
                        </td>
                        <td>
                          {row.nihss_total === null ? (
                            <span className="text-muted">not scored</span>
                          ) : (
                            <span
                              className={`badge ${severityBadge(
                                row.nihss_severity || '',
                              )}`}
                            >
                              {row.nihss_total} ·{' '}
                              {severityLabel(row.nihss_severity || '')}
                            </span>
                          )}
                        </td>
                        <td className="text-capitalize">
                          {row.stroke_type.replace('_', ' ')}
                        </td>
                        <td className="text-capitalize">
                          {row.status.replace('_', ' ')}
                        </td>
                        <td>{formatMinutes(row.door_to_ct_minutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'emergency' && (
        <EmergencyBoard
          facilityId={facilityId}
          canAcknowledge={[
            'admin',
            'physician',
            'nurse',
            'registered_nurse',
          ].includes(user?.role || '')}
          isAdmin={user?.role === 'admin'}
          currentUserId={undefined}
          onOpen={(id) => {
            setSelectedId(id);
            setTab('board');
          }}
        />
      )}

      {tab === 'activate' && canContribute && (
        <ActivationForm
          onCreated={(id) => {
            setSelectedId(id);
            setTab('board');
            refresh();
          }}
        />
      )}
      {tab === 'activate' && !canContribute && (
        <div className="alert alert-warning small">
          Your role can view stroke care but not start a new activation.
        </div>
      )}

      {tab === 'board' && selectedId !== null && protocols && (
        <StrokeDetail
          activationId={selectedId}
          protocols={protocols}
          role={user?.role}
          onChanged={refresh}
        />
      )}

      {tab === 'quality' && (
        <div className="row g-3">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-semibold">Door → imaging</h6>
                <div className="fs-3 fw-bold">
                  {formatMinutes(quality?.averageDoorToCtMinutes)}
                </div>
                <div className="small text-muted">
                  Target ≤ {quality?.targets.doorToImagingMinutes ?? 25} min ·{' '}
                  {quality?.ctWithinTargetPercent === null ||
                  quality?.ctWithinTargetPercent === undefined
                    ? 'no eligible cases'
                    : `${quality.ctWithinTargetPercent}% within target`}
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-semibold">Door → needle</h6>
                <div className="fs-3 fw-bold">
                  {formatMinutes(quality?.averageDoorToNeedleMinutes)}
                </div>
                <div className="small text-muted">
                  Target ≤ {quality?.targets.doorToNeedleMinutes ?? 60} min ·{' '}
                  {quality?.needleWithinTargetPercent === null ||
                  quality?.needleWithinTargetPercent === undefined
                    ? 'no thrombolysis cases'
                    : `${quality.needleWithinTargetPercent}% within target`}
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-semibold">
                  Last {quality?.windowDays ?? 30} days
                </h6>
                <div className="fs-3 fw-bold">{quality?.activations ?? 0}</div>
                <div className="small text-muted">
                  activations · {quality?.thrombolysisGiven ?? 0} thrombolysis ·{' '}
                  {quality?.thrombectomyGiven ?? 0} thrombectomy
                </div>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="alert alert-info small mb-0">
              Timings come from the recorded arrival, imaging and treatment
              milestones. Percentages are withheld when the denominator is zero —
              an empty service has no performance figure, not 0 %.
            </div>
          </div>
        </div>
      )}

      {tab === 'protocols' && protocols && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white fw-semibold">
                {protocols.acute.protocol.label}
              </div>
              <div className="card-body small">
                <div className="text-muted mb-2">
                  v{protocols.acute.protocol.version} · effective{' '}
                  {protocols.acute.protocol.effectiveDate} · advisory only
                </div>
                <p>{protocols.acute.protocol.source}</p>
                <ul className="mb-0">
                  <li>
                    IV thrombolysis window:{' '}
                    {protocols.acute.timingTargets.thrombolysisWindowMinutes}{' '}
                    minutes
                  </li>
                  <li>
                    Thrombectomy window:{' '}
                    {protocols.acute.timingTargets.thrombectomyWindowMinutes}{' '}
                    minutes
                  </li>
                  <li>
                    Door-to-needle target:{' '}
                    {protocols.acute.timingTargets.doorToNeedleMinutes} minutes
                  </li>
                  <li>
                    Door-to-imaging target:{' '}
                    {protocols.acute.timingTargets.doorToImagingMinutes} minutes
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white fw-semibold">
                NIHSS · {protocols.nihss.protocol.label}
              </div>
              <div className="card-body small">
                <div className="text-muted mb-2">
                  v{protocols.nihss.protocol.version} ·{' '}
                  {protocols.nihss.items.length} scored fields · maximum{' '}
                  {protocols.nihss.items.reduce(
                    (sum, item) => sum + item.max,
                    0,
                  )}
                </div>
                <p>{protocols.nihss.protocol.source}</p>
                <ol className="mb-0 ps-3">
                  {protocols.nihss.items.map((item) => (
                    <li key={item.key}>
                      {item.label} (0–{item.max})
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">
                Versioned order sets
              </div>
              <div className="card-body small">
                {protocols.acute.orderSets.map((set) => (
                  <div key={set.key} className="mb-3">
                    <div className="fw-semibold">
                      {set.label} · v{set.protocol.version}
                    </div>
                    <div className="text-muted">{set.description}</div>
                    <ul className="mb-1">
                      {set.items.map((item) => (
                        <li key={item.key}>
                          <span className="badge bg-secondary-subtle text-secondary me-1">
                            {item.category}
                          </span>
                          {item.label}
                          {item.requiresExplicitDoseConfirmation
                            ? ' — clinician dosing decision required'
                            : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">
                Facility modules
              </div>
              <div className="card-body small">
                <div className="row g-2">
                  {protocols.modules.map((module) => (
                    <div className="col-md-4" key={module.key}>
                      <div className="border rounded p-2 h-100">
                        <div className="fw-semibold">{module.label}</div>
                        <div className="text-muted">{module.description}</div>
                        <div className="text-capitalize text-muted">
                          {module.settings.join(' · ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
