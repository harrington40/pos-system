import { useTranslation } from 'react-i18next';
import type { VitalSign } from '../../types/encounter';
import { formatVital, formatBP } from '../../utils/vitalsClassify';

interface Props {
  pid: string;
  eid: string;
  vitals: VitalSign[];
}

export default function VitalSignsForm({ vitals }: Props) {
  const { t } = useTranslation();
  if (vitals.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">{t('encounters.vitalSigns.title')}</h5>
        </div>
        <div className="card-body text-center text-muted p-4">
          <i className="bi bi-heart-pulse" style={{ fontSize: '2rem' }}></i>
          <p className="mt-2 mb-0">{t('encounters.vitalSigns.none')}</p>
        </div>
      </div>
    );
  }

  // Display the most recent vitals
  const latest = vitals[vitals.length - 1];

  const vitalFields: { label: string; value: string | undefined; unit: string }[] = [
    { label: t('encounters.vitalSigns.bp'), value: formatBP(latest.BP_systolic, latest.BP_diastolic), unit: 'mmHg' },
    { label: t('encounters.vitalSigns.hr'), value: formatVital(latest.pulse), unit: 'bpm' },
    { label: t('encounters.vitalSigns.temperature'), value: formatVital(latest.temperature, 1), unit: '°F/°C' },
    { label: t('encounters.vitalSigns.respiration'), value: formatVital(latest.respiration), unit: '/min' },
    { label: t('encounters.vitalSigns.spo2'), value: formatVital(latest.oxygen_saturation), unit: '%' },
    { label: t('encounters.vitalSigns.weight'), value: formatVital(latest.weight, 1), unit: 'lbs/kg' },
    { label: t('encounters.vitalSigns.height'), value: formatVital(latest.height, 1), unit: 'in/cm' },
    { label: t('encounters.vitalSigns.bmi'), value: formatVital(latest.BMI, 1), unit: 'kg/m²' },
    { label: t('encounters.vitalSigns.waist'), value: formatVital(latest.waist_circumference, 1), unit: 'in/cm' },
    { label: t('encounters.vitalSigns.head'), value: formatVital(latest.head_circumference, 1), unit: 'in/cm' },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0">{t('encounters.vitalSigns.title')}</h5>
      </div>
      <div className="card-body">
        <div className="text-muted small mb-3">
          {t('encounters.vitalSigns.recorded')} {latest.date || t('encounters.vitalSigns.unknownDate')}
        </div>
        <div className="row">
          {vitalFields.map((field) => (
            <div className="col-md-3 col-sm-4 col-6 mb-3" key={field.label}>
              <div className="card bg-light h-100">
                <div className="card-body text-center py-3">
                  <div className="text-muted small text-uppercase mb-1">{field.label}</div>
                  <div className="fw-bold fs-5">
                    {field.value || <span className="text-muted">—</span>}
                  </div>
                  <div className="text-muted small">{field.unit}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
