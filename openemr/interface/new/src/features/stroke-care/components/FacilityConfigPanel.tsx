import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getFacilityStrokeModules,
  getFacilityStrokeSettings,
  listFacilityStrokeUsers,
  setFacilityStrokeModules,
  setFacilityStrokeSettings,
  setFacilityStrokeUser,
  type CareSetting,
  type StrokeModule,
} from '../../../api/endpoints/strokeCare';
import { apiErrorMessage } from '../errors';

interface Props {
  facilityId: number | null;
  isAdmin: boolean;
}

const SETTINGS: Array<{ key: CareSetting; labelKey: string }> = [
  { key: 'outpatient', labelKey: 'configuration.outpatient' },
  { key: 'acute', labelKey: 'configuration.acute' },
  { key: 'comprehensive', labelKey: 'configuration.comprehensive' },
];

/**
 * Module 9. Administrators choose which stroke modules are available at a
 * facility. This is software configuration only; it does not confer clinical
 * accreditation or stroke-centre certification.
 */
export default function FacilityConfigPanel({ facilityId, isAdmin }: Props) {
  const { t } = useTranslation('stroke');
  const qc = useQueryClient();
  const [setting, setSetting] = useState<CareSetting>('comprehensive');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState('');
  const [escalationMinutes, setEscalationMinutes] = useState('5');
  const [transferMinutes, setTransferMinutes] = useState('30');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['stroke-facility-modules', facilityId, setting],
    queryFn: () => getFacilityStrokeModules(facilityId as number, setting),
    enabled: Boolean(facilityId),
  });

  const { data: settings } = useQuery({
    queryKey: ['stroke-facility-settings', facilityId],
    queryFn: () => getFacilityStrokeSettings(facilityId as number),
    enabled: Boolean(facilityId),
  });

  useEffect(() => {
    if (!settings) return;
    setEscalationMinutes(String(settings.alertEscalationMinutes));
    setTransferMinutes(String(settings.transferAcceptanceMinutes));
  }, [settings]);

  const { data: users = [] } = useQuery({
    queryKey: ['stroke-facility-users', facilityId],
    queryFn: () => listFacilityStrokeUsers(facilityId as number),
    enabled: Boolean(facilityId) && isAdmin,
  });

  useEffect(() => {
    if (!data?.modules) return;
    setEnabled(
      Object.fromEntries(
        data.modules.map((module: StrokeModule) => [
          module.key,
          Boolean(module.enabled),
        ]),
      ),
    );
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      setFacilityStrokeModules(
        facilityId as number,
        Object.entries(enabled).map(([key, value]) => ({
          key,
          enabled: value,
        })),
      ),
    onSuccess: () => {
      setError('');
      setSaved(t('configuration.saved'));
      qc.invalidateQueries({ queryKey: ['stroke-facility-modules'] });
    },
    onError: (e) => setError(apiErrorMessage(e, 'Configuration failed')),
  });

  const saveSettings = useMutation({
    mutationFn: () =>
      setFacilityStrokeSettings(facilityId as number, {
        alertEscalationMinutes: Number(escalationMinutes),
        transferAcceptanceMinutes: Number(transferMinutes),
      }),
    onSuccess: () => {
      setError('');
      setSaved(t('configuration.saved'));
      qc.invalidateQueries({ queryKey: ['stroke-facility-settings'] });
    },
    onError: (e) => setError(apiErrorMessage(e, 'SLA configuration failed')),
  });

  const assign = useMutation({
    mutationFn: (input: { id: number; enabled: boolean }) =>
      setFacilityStrokeUser(facilityId as number, input.id, input.enabled),
    onSuccess: () => {
      setUserId('');
      qc.invalidateQueries({ queryKey: ['stroke-facility-users'] });
    },
    onError: (e) => setError(apiErrorMessage(e, 'User assignment failed')),
  });

  if (!isAdmin) {
    return (
      <div className="alert alert-warning small">
        Administrator access is required to change facility configuration.
      </div>
    );
  }
  if (!facilityId) {
    return (
      <div className="alert alert-info small">
        {t('configuration.facilityRequired')}
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body small">
        <h6 className="fw-semibold">{t('configuration.heading')}</h6>
        <p className="text-muted">{t('configuration.description')}</p>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {saved && <div className="alert alert-success py-2">{saved}</div>}
        <div className="row g-2 align-items-end mb-3">
          <div className="col-md-4">
            <label className="form-label" htmlFor="stroke-config-setting">
              {t('configuration.careSetting')}
            </label>
            <select
              id="stroke-config-setting"
              className="form-select form-select-sm"
              value={setting}
              onChange={(event) =>
                setSetting(event.target.value as CareSetting)
              }
            >
              {SETTINGS.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {t(entry.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => save.mutate()}
              disabled={save.isPending || isLoading}
            >
              {t('configuration.save')}
            </button>
          </div>
        </div>
        <div className="row g-2 mb-3">
          {(data?.modules ?? []).map((module) => (
            <div className="col-md-4" key={module.key}>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`stroke-module-${module.key}`}
                  checked={Boolean(enabled[module.key])}
                  onChange={(event) =>
                    setEnabled((current) => ({
                      ...current,
                      [module.key]: event.target.checked,
                    }))
                  }
                />
                <label
                  className="form-check-label"
                  htmlFor={`stroke-module-${module.key}`}
                >
                  <span className="fw-semibold">{module.label}</span>
                  <span className="d-block text-muted">
                    {module.description}
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="border-top pt-3 mt-2">
          <div className="fw-semibold mb-1">Acute response SLAs</div>
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label" htmlFor="stroke-escalation-minutes">
                Alert escalation (minutes)
              </label>
              <input
                id="stroke-escalation-minutes"
                className="form-control form-control-sm"
                inputMode="numeric"
                value={escalationMinutes}
                onChange={(event) => setEscalationMinutes(event.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="stroke-transfer-minutes">
                Transfer acceptance (minutes)
              </label>
              <input
                id="stroke-transfer-minutes"
                className="form-control form-control-sm"
                inputMode="numeric"
                value={transferMinutes}
                onChange={(event) => setTransferMinutes(event.target.value)}
              />
            </div>
            <div className="col-md-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => saveSettings.mutate()}
                disabled={saveSettings.isPending}
              >
                Save SLAs
              </button>
            </div>
            <div className="col-md-3 small text-muted">
              Defaults: 5-minute escalation, 30-minute acceptance.
            </div>
          </div>
        </div>

        <h6 className="fw-semibold mt-4">{t('configuration.users')}</h6>
        <div className="row g-2 align-items-end mb-2">
          <div className="col-md-3">
            <label className="form-label" htmlFor="stroke-config-user">
              {t('configuration.userId')}
            </label>
            <input
              id="stroke-config-user"
              className="form-control form-control-sm"
              inputMode="numeric"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
          </div>
          <div className="col-md-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={!userId.trim() || assign.isPending}
              onClick={() =>
                assign.mutate({ id: Number(userId), enabled: true })
              }
            >
              {t('configuration.assign')}
            </button>
          </div>
        </div>
        <ul className="list-group list-group-flush">
          {users.map((user) => (
            <li
              key={user.id}
              className="list-group-item px-0 d-flex justify-content-between align-items-center"
            >
              <span>
                {[user.fname, user.lname].filter(Boolean).join(' ') ||
                  user.username ||
                  `User ${user.user_id}`}{' '}
                <span className="text-muted">({user.role || 'user'})</span>
              </span>
              <button
                type="button"
                className="btn btn-sm btn-link text-danger"
                onClick={() =>
                  assign.mutate({ id: user.user_id, enabled: false })
                }
              >
                {t('configuration.remove')}
              </button>
            </li>
          ))}
          {!users.length && (
            <li className="list-group-item px-0 text-muted">
              No facility-specific user assignments. Authorized clinicians can
              use all facilities until assignments are configured.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
