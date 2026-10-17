import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStrokeRadiologyReport,
  getStrokeDicomMetadata,
  linkStrokeImaging,
  listStrokeRadiologyReports,
  type StrokeDicomMetadata,
  type StrokeImagingLink,
} from '../../../api/endpoints/strokeCare';
import { formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  activationId: number;
  imaging: StrokeImagingLink[];
  canDocument: boolean;
  onChanged: () => void;
}

const MODALITIES = ['ct', 'cta', 'ctp', 'mri', 'mra', 'angiography'];

/**
 * Links a study from the existing imaging/DICOM store.
 *
 * Stroke care never uploads a second copy: it stores the imaging record id or
 * the DICOM StudyInstanceUID so the viewer opens the same study.
 */
export default function ImagingPanel({
  activationId,
  imaging,
  canDocument,
  onChanged,
}: Props) {
  const [modality, setModality] = useState('ct');
  const [imagingId, setImagingId] = useState('');
  const [dicomStudyUid, setDicomStudyUid] = useState('');
  const [findings, setFindings] = useState('');
  const [status, setStatus] = useState('performed');
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<StrokeDicomMetadata | null>(null);
  const [impression, setImpression] = useState('');
  const [reportImagingId, setReportImagingId] = useState('');
  const qc = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ['stroke-radiology-reports', activationId],
    queryFn: () => listStrokeRadiologyReports(activationId),
  });

  const inspect = useMutation({
    mutationFn: (recordId: number) => getStrokeDicomMetadata(recordId),
    onSuccess: (data) => setMetadata(data),
    onError: (e) => setError(apiErrorMessage(e, 'Could not read DICOM metadata')),
  });

  const addReport = useMutation({
    mutationFn: () =>
      addStrokeRadiologyReport(activationId, {
        strokeImagingId: reportImagingId.trim()
          ? Number(reportImagingId)
          : null,
        impression: impression.trim() || null,
        status: 'final',
      }),
    onSuccess: () => {
      setImpression('');
      setError('');
      qc.invalidateQueries({
        queryKey: ['stroke-radiology-reports', activationId],
      });
      onChanged();
    },
    onError: (e) => setError(apiErrorMessage(e, 'Could not save report')),
  });

  const link = useMutation({
    mutationFn: () =>
      linkStrokeImaging(activationId, {
        modality,
        imagingId: imagingId.trim() ? Number(imagingId) : null,
        dicomStudyUid: dicomStudyUid.trim() || null,
        findings: findings.trim() || null,
        interpretationStatus: status,
      }),
    onSuccess: () => {
      setImagingId('');
      setDicomStudyUid('');
      setFindings('');
      setError('');
      onChanged();
    },
    onError: (e) => setError(apiErrorMessage(e, 'Could not link the study')),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    link.mutate();
  };

  return (
    <div>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {canDocument ? (
        <form onSubmit={submit} className="row g-2 align-items-end mb-3">
          <div className="col-md-2">
            <label className="form-label small fw-semibold" htmlFor="img-modality">
              Modality
            </label>
            <select
              id="img-modality"
              className="form-select form-select-sm"
              value={modality}
              onChange={(e) => setModality(e.target.value)}
            >
              {MODALITIES.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold" htmlFor="img-id">
              Imaging id
            </label>
            <input
              id="img-id"
              className="form-control form-control-sm"
              value={imagingId}
              onChange={(e) => setImagingId(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="img-uid">
              DICOM StudyInstanceUID
            </label>
            <input
              id="img-uid"
              className="form-control form-control-sm"
              value={dicomStudyUid}
              onChange={(e) => setDicomStudyUid(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold" htmlFor="img-status">
              Status
            </label>
            <select
              id="img-status"
              className="form-select form-select-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ordered">Ordered</option>
              <option value="performed">Performed</option>
              <option value="reported">Reported</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold" htmlFor="img-findings">
              Findings
            </label>
            <input
              id="img-findings"
              className="form-control form-control-sm"
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
            />
          </div>
          <div className="col-12">
            <button
              className="btn btn-sm btn-outline-secondary"
              type="submit"
              disabled={link.isPending}
            >
              {link.isPending ? 'Linking…' : 'Link existing study'}
            </button>
            <span className="text-muted small ms-2">
              Provide an imaging record id or a DICOM StudyInstanceUID.
            </span>
          </div>
        </form>
      ) : (
        <p className="text-muted small">
          Your role can read imaging links but not add them.
        </p>
      )}

      {imaging.length === 0 ? (
        <p className="text-muted small mb-0">No imaging study linked yet.</p>
      ) : (
        <ul className="list-group list-group-flush small">
          {imaging.map((study) => (
            <li key={study.id} className="list-group-item px-0">
              <div className="d-flex justify-content-between">
                <span className="fw-semibold text-uppercase">
                  {study.modality}
                </span>
                <span className="badge bg-info-subtle text-info-emphasis">
                  {study.interpretation_status}
                </span>
              </div>
              <div className="text-muted">
                {study.imaging_id
                  ? `Imaging #${study.imaging_id}`
                  : study.dicom_study_uid || study.orthanc_study_id}{' '}
                · {formatWhen(study.performed_at)}
              </div>
              {study.study_description && (
                <div>{study.study_description}</div>
              )}
              <div className="text-muted">
                {study.series_count != null && `${study.series_count} series · `}
                {study.instance_count != null &&
                  `${study.instance_count} images · `}
                patient match: {study.patient_match_status || 'unverified'}
              </div>
              {study.findings && <div>{study.findings}</div>}
              <div className="mt-1 d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => inspect.mutate(study.id)}
                  disabled={inspect.isPending}
                >
                  DICOM metadata
                </button>
                <a
                  className="btn btn-sm btn-outline-primary"
                  href="/dicom"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open authorized viewer
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      {metadata && (
        <div className="alert alert-secondary py-2 mt-3 mb-2">
          <div className="fw-semibold">
            {metadata.study_description || metadata.modality} ·{' '}
            {metadata.interpretation_status}
          </div>
          <div>
            UID {metadata.dicom_study_uid || metadata.orthanc_study_id || '—'} ·
            accession {metadata.accession_number || '—'} ·{' '}
            {metadata.series_count ?? '—'} series /{' '}
            {metadata.instance_count ?? '—'} images
          </div>
          <div>
            Patient match: {metadata.patient_match_status || 'unverified'} ·
            ordered {formatWhen(metadata.ordered_at)} · performed{' '}
            {formatWhen(metadata.performed_at)} · interpreted{' '}
            {formatWhen(metadata.interpreted_at)}
          </div>
          <div className="text-muted">{metadata.viewerNote}</div>
        </div>
      )}

      <div className="border-top pt-2 mt-3">
        <div className="fw-semibold mb-1">Radiology reports</div>
        {canDocument && (
          <form
            className="row g-1 mb-2"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              addReport.mutate();
            }}
          >
            <div className="col-md-3">
              <input
                aria-label="Imaging record id for report"
                className="form-control form-control-sm"
                placeholder="Imaging record id (optional)"
                value={reportImagingId}
                onChange={(e) => setReportImagingId(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="col-md-7">
              <input
                aria-label="Radiology impression"
                className="form-control form-control-sm"
                placeholder="Impression / interpretation"
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-sm btn-outline-primary w-100"
                type="submit"
                disabled={addReport.isPending}
              >
                Save report
              </button>
            </div>
          </form>
        )}
        <ul className="list-group list-group-flush">
          {reports.map((report) => (
            <li key={report.id} className="list-group-item px-0 py-1">
              <span className="badge bg-secondary me-1">{report.status}</span>
              {report.impression || 'No impression'}
              <div className="text-muted">
                {formatWhen(report.reported_at)} ·{' '}
                {report.reported_by_name || 'Reporter not recorded'}
              </div>
            </li>
          ))}
          {!reports.length && (
            <li className="list-group-item px-0 text-muted">
              No radiology report linked.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
