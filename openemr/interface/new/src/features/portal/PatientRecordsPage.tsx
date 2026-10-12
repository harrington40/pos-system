import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function PatientRecordsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const raw = localStorage.getItem('portal_patient');
  const patient = raw ? JSON.parse(raw) : null;
  if (!patient) { navigate('/portal/login'); return null; }

  const downloadCcda = () => window.open(`http://localhost:3002/api/patients/${patient.pid}/ccda`, '_blank');
  const downloadFhir = () => window.open(`http://localhost:3002/api/fhir/Patient/${patient.pid}`, '_blank');

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-dark bg-primary px-4"><span className="navbar-brand"><i className="bi bi-download me-2"></i>{t('portal.records.title')}</span>
        <button className="btn btn-outline-light btn-sm" onClick={() => navigate('/portal/dashboard')}>{t('portal.records.back')}</button></nav>
      <div className="container py-4">
        <div className="row g-3">
          <div className="col-md-4"><div className="card shadow-sm text-center" style={{cursor:'pointer'}} onClick={downloadCcda}><div className="card-body py-5"><i className="bi bi-file-earmark-text text-primary" style={{fontSize:'3rem'}}></i><h5 className="mt-3">{t('portal.records.ccdaTitle')}</h5><p className="text-muted small">{t('portal.records.ccdaDesc')}</p><span className="badge bg-primary">{t('portal.records.download')}</span></div></div></div>
          <div className="col-md-4"><div className="card shadow-sm text-center" style={{cursor:'pointer'}} onClick={downloadFhir}><div className="card-body py-5"><i className="bi bi-code-slash text-info" style={{fontSize:'3rem'}}></i><h5 className="mt-3">{t('portal.records.fhirTitle')}</h5><p className="text-muted small">{t('portal.records.fhirDesc')}</p><span className="badge bg-info">{t('portal.records.download')}</span></div></div></div>
          <div className="col-md-4"><div className="card shadow-sm text-center"><div className="card-body py-5"><i className="bi bi-send text-success" style={{fontSize:'3rem'}}></i><h5 className="mt-3">{t('portal.records.directTitle')}</h5><p className="text-muted small">{t('portal.records.directDesc')}</p><span className="badge bg-success">{t('portal.records.comingSoon')}</span></div></div></div>
        </div>
      </div>
    </div>
  );
}
