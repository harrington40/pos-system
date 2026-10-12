import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatientEncounters, createEncounter } from '../../api/endpoints/encounters';
import { getPatient } from '../../api/endpoints/patients';
import nestClient from '../../api/nest-client';
import { formatPatientNameLastFirst } from '../../utils/patientName';

const CLASS_CODE_OPTIONS = [
  { value: 'AMB', labelKey: 'classAmb' },
  { value: 'EMER', labelKey: 'classEmer' },
  { value: 'IMP', labelKey: 'classImp' },
  { value: 'SS', labelKey: 'classSs' },
  { value: 'OBS', labelKey: 'classObs' },
  { value: 'VR', labelKey: 'classVr' },
];

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  reason: '',
  class_code: 'AMB',
  pc_catid: '5',
  facility: '',
  provider_id: '',
};

export default function EncounterListPage() {
  const { t } = useTranslation();
  const { id: patientUuid } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientUuid],
    queryFn: () => getPatient(patientUuid!),
    enabled: !!patientUuid,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers-list'],
    queryFn: async () => { const r = await nestClient.get('/admin/users'); return r.data; },
  });

  const { data: encounters = [], isLoading } = useQuery({
    queryKey: ['patient', patientUuid, 'encounters'],
    queryFn: () => getPatientEncounters(patientUuid!),
    enabled: !!patientUuid,
  });

  // Auto-populate provider when patient loads
  const patientProviderId = patient?.provider || '';

  const createMutation = useMutation({
    mutationFn: (data: {
      date: string;
      reason: string;
      class_code: string;
      pc_catid: string;
      provider_id?: string;
    }) => createEncounter(patientUuid!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientUuid, 'encounters'] });
      setShowCreate(false);
      setForm(emptyForm);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const getClassBadge = (code: string | undefined) => {
    const colors: Record<string, string> = {
      AMB: 'bg-success',
      EMER: 'bg-danger',
      IMP: 'bg-primary',
      OBS: 'bg-warning text-dark',
      VR: 'bg-info',
    };
    return colors[code ?? ''] ?? 'bg-secondary';
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <a href="/app/patients" onClick={(e) => { e.preventDefault(); navigate('/patients'); }} style={{ cursor: 'pointer' }}>
              {t('encounters.list.breadcrumbPatients')}
            </a>
          </li>
          <li className="breadcrumb-item">
            <a href={`/app/patients/${patientUuid}`} onClick={(e) => { e.preventDefault(); navigate(`/patients/${patientUuid}`); }} style={{ cursor: 'pointer' }}>
              {patient ? formatPatientNameLastFirst(patient) : t('encounters.list.patientFallback')}
            </a>
          </li>
          <li className="breadcrumb-item active">{t('encounters.list.breadcrumb')}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">
          <i className="bi bi-file-medical me-2"></i>
          {t('encounters.list.title')}
          {patient && (
            <small className="text-muted ms-2">
              {formatPatientNameLastFirst(patient)}
            </small>
          )}
        </h3>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <i className="bi bi-plus-lg me-1"></i>
          {t('encounters.list.newEncounter')}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">{t('encounters.list.newEncounter')}</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateSubmit}>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">{t('encounters.list.lDate')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">{t('encounters.list.lType')}</label>
                  <select
                    className="form-select"
                    value={form.class_code}
                    onChange={(e) => setForm({ ...form, class_code: e.target.value })}
                  >
                    {CLASS_CODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(`encounters.list.${opt.labelKey}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">{t('encounters.list.lCategory')}</label>
                  <select
                    className="form-select"
                    value={form.pc_catid}
                    onChange={(e) => setForm({ ...form, pc_catid: e.target.value })}
                  >
                    <option value="5">{t('encounters.list.catOfficeVisit')}Office Visit</option>
                    <option value="2">{t('encounters.list.catConsultation')}Consultation</option>
                    <option value="3">{t('encounters.list.catEmergency')}Emergency</option>
                    <option value="9">{t('encounters.list.catFollowUp')}Follow-up</option>
                    <option value="10">{t('encounters.list.catWellness')}Wellness Visit</option>
                  </select>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">{t('encounters.list.lProvider')}</label>
                  <select
                    className="form-select"
                    value={form.provider_id || patientProviderId}
                    onChange={(e) => setForm({ ...form, provider_id: e.target.value })}
                  >
                    <option value="">{t('encounters.list.selectProvider')}</option>
                    {providers.filter((p: any) => p.active).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.title ? `${p.title} ` : ''}{p.fname} {p.lname}{p.specialty ? ` (${p.specialty})` : ''}
                      </option>
                    ))}
                  </select>
                  {patientProviderId && !form.provider_id && (
                    <small className="text-success">
                      <i className="bi bi-person-check me-1"></i>
                      {t('encounters.list.autoAssigned')}
                    </small>
                  )}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">{t('encounters.list.lFacility')}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.facility}
                    onChange={(e) => setForm({ ...form, facility: e.target.value })}
                    placeholder={t('encounters.list.facilityPlaceholder')}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">{t('encounters.list.lReason')}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder={t('encounters.list.reasonPlaceholder')}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('encounters.list.creating') : t('encounters.list.create')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Encounter list */}
      {isLoading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{t('encounters.list.loading')}</span>
          </div>
        </div>
      ) : encounters.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-muted p-4">
            <i className="bi bi-file-medical" style={{ fontSize: '2rem' }}></i>
            <p className="mt-2 mb-0">{t('encounters.list.none')}</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('encounters.list.thDate')}</th>
                    <th>{t('encounters.list.thType')}</th>
                    <th>{t('encounters.list.thReason')}</th>
                    <th>{t('encounters.list.thFacility')}</th>
                    <th>{t('encounters.list.thProvider')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {encounters.map((enc) => (
                    <tr
                      key={enc.uuid}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/patients/${patientUuid}/encounters/${enc.uuid}`)}
                    >
                      <td>{enc.date}</td>
                      <td>
                        <span className={`badge ${getClassBadge(enc.class_code)}`}>
                          {enc.class_title || enc.class_code || '—'}
                        </span>
                      </td>
                      <td>{enc.reason || '—'}</td>
                      <td>{enc.facility || enc.facility_id || '—'}</td>
                      <td>{enc.provider_id || '—'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${patientUuid}/encounters/${enc.uuid}`);
                          }}
                        >
                          <i className="bi bi-arrow-right"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
