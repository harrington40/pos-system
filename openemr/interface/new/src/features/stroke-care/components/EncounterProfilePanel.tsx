import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getStrokeEncounterContext,
  saveStrokeEncounterProfile,
  type EncounterProfileInput,
} from '../../../api/endpoints/strokeCare';
import { formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  activationId: number;
  canDocument: boolean;
  onChanged: () => void;
}

const RISK_FACTORS = [
  'Hypertension',
  'Diabetes mellitus',
  'Atrial fibrillation',
  'Dyslipidaemia',
  'Smoking',
  'Prior stroke/TIA',
  'Carotid disease',
  'Obesity',
  'Alcohol excess',
  'Sleep apnoea',
  'Chronic kidney disease',
];

function toLocalInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Module A: stroke-specific encounter profile plus existing OpenRx context. */
export default function EncounterProfilePanel({
  activationId,
  canDocument,
  onChanged,
}: Props) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['stroke-profile', activationId],
    queryFn: () => getStrokeEncounterContext(activationId),
  });

  const [symptomDiscoveredAt, setSymptomDiscoveredAt] = useState('');
  const [initialNeuroFindings, setInitialNeuroFindings] = useState('');
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [priorStrokeTia, setPriorStrokeTia] = useState('unknown');
  const [priorStrokeDetails, setPriorStrokeDetails] = useState('');
  const [relevantHistory, setRelevantHistory] = useState('');
  const [attendingProviderId, setAttendingProviderId] = useState('');
  const [attendingProviderName, setAttendingProviderName] = useState('');
  const [facilityDepartment, setFacilityDepartment] = useState('');
  const [encounterStatus, setEncounterStatus] = useState('active');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!data) return;
    const profile = data.profile;
    setSymptomDiscoveredAt(toLocalInput(profile?.symptom_discovered_at));
    setInitialNeuroFindings(profile?.initial_neuro_findings ?? '');
    setRiskFactors(profile?.riskFactors ?? []);
    setPriorStrokeTia(
      profile?.priorStrokeTia === null || profile?.priorStrokeTia === undefined
        ? 'unknown'
        : profile.priorStrokeTia
          ? 'yes'
          : 'no',
    );
    setPriorStrokeDetails(profile?.prior_stroke_details ?? '');
    setRelevantHistory(profile?.relevant_history ?? '');
    setAttendingProviderId(
      profile?.attending_provider_id ? String(profile.attending_provider_id) : '',
    );
    setAttendingProviderName(profile?.attending_provider_name ?? '');
    setFacilityDepartment(profile?.facility_department ?? '');
    setEncounterStatus(data.activation.status || 'active');
  }, [data]);

  const save = useMutation({
    mutationFn: (input: EncounterProfileInput) =>
      saveStrokeEncounterProfile(activationId, input),
    onSuccess: () => {
      setSaveError('');
      qc.invalidateQueries({ queryKey: ['stroke-profile', activationId] });
      qc.invalidateQueries({ queryKey: ['stroke-detail', activationId] });
      onChanged();
    },
    onError: (e) =>
      setSaveError(apiErrorMessage(e, 'Could not save the encounter profile')),
  });

  const toggleRisk = (factor: string) => {
    setRiskFactors((current) =>
      current.includes(factor)
        ? current.filter((f) => f !== factor)
        : [...current, factor],
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({
      symptomDiscoveredAt: toIso(symptomDiscoveredAt),
      initialNeuroFindings: initialNeuroFindings.trim() || null,
      riskFactors,
      priorStrokeTia:
        priorStrokeTia === 'unknown' ? null : priorStrokeTia === 'yes',
      priorStrokeDetails: priorStrokeDetails.trim() || null,
      relevantHistory: relevantHistory.trim() || null,
      attendingProviderId: attendingProviderId.trim()
        ? Number(attendingProviderId)
        : null,
      attendingProviderName: attendingProviderName.trim() || null,
      facilityDepartment: facilityDepartment.trim() || null,
      encounterStatus,
    });
  };

  if (isLoading) return <p className="text-muted small">Loading encounter…</p>;
  if (error || !data) {
    return <p className="text-danger small">The encounter profile could not be loaded.</p>;
  }

  return (
    <div>
      {saveError && <div className="alert alert-danger py-2 small">{saveError}</div>}
      <div className="row g-3">
        <div className="col-lg-7">
          <form onSubmit={submit}>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label small fw-semibold" htmlFor="ep-symptom">
                  Symptom discovery time
                </label>
                <input
                  id="ep-symptom"
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={symptomDiscoveredAt}
                  onChange={(e) => setSymptomDiscoveredAt(e.target.value)}
                  disabled={!canDocument}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold" htmlFor="ep-prior">
                  Prior stroke / TIA
                </label>
                <select
                  id="ep-prior"
                  className="form-select form-select-sm"
                  value={priorStrokeTia}
                  onChange={(e) => setPriorStrokeTia(e.target.value)}
                  disabled={!canDocument}
                >
                  <option value="unknown">Not documented</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold" htmlFor="ep-status">
                  Encounter status
                </label>
                <select
                  id="ep-status"
                  className="form-select form-select-sm"
                  value={encounterStatus}
                  onChange={(e) => setEncounterStatus(e.target.value)}
                  disabled={!canDocument}
                >
                  <option value="active">Active</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="mt-2">
              <div className="form-label small fw-semibold">Risk factors</div>
              <div className="d-flex flex-wrap gap-2">
                {RISK_FACTORS.map((factor) => (
                  <label
                    key={factor}
                    className={`btn btn-sm ${riskFactors.includes(factor) ? 'btn-primary' : 'btn-outline-secondary'}`}
                  >
                    <input
                      type="checkbox"
                      className="d-none"
                      checked={riskFactors.includes(factor)}
                      onChange={() => toggleRisk(factor)}
                      disabled={!canDocument}
                    />
                    {factor}
                  </label>
                ))}
              </div>
            </div>

            <div className="row g-2 mt-1">
              <div className="col-md-6">
                <label className="form-label small fw-semibold" htmlFor="ep-attending">
                  Attending neurologist id
                </label>
                <input
                  id="ep-attending"
                  className="form-control form-control-sm"
                  value={attendingProviderId}
                  onChange={(e) => setAttendingProviderId(e.target.value)}
                  inputMode="numeric"
                  disabled={!canDocument}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold" htmlFor="ep-attending-name">
                  Attending name
                </label>
                <input
                  id="ep-attending-name"
                  className="form-control form-control-sm"
                  value={attendingProviderName}
                  onChange={(e) => setAttendingProviderName(e.target.value)}
                  disabled={!canDocument}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold" htmlFor="ep-dept">
                  Facility / department
                </label>
                <input
                  id="ep-dept"
                  className="form-control form-control-sm"
                  value={facilityDepartment}
                  onChange={(e) => setFacilityDepartment(e.target.value)}
                  disabled={!canDocument}
                />
              </div>
            </div>

            {[
              ['Initial neurological findings', initialNeuroFindings, setInitialNeuroFindings, 'ep-findings'],
              ['Prior stroke / TIA details', priorStrokeDetails, setPriorStrokeDetails, 'ep-prior-details'],
              ['Relevant clinical history', relevantHistory, setRelevantHistory, 'ep-history'],
            ].map(([label, value, setter, id]) => (
              <div className="mt-2" key={String(id)}>
                <label className="form-label small fw-semibold" htmlFor={String(id)}>
                  {String(label)}
                </label>
                <textarea
                  id={String(id)}
                  className="form-control form-control-sm"
                  rows={2}
                  value={String(value)}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                  disabled={!canDocument}
                />
              </div>
            ))}

            {canDocument && (
              <button className="btn btn-sm btn-primary mt-2" type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save encounter profile'}
              </button>
            )}
          </form>
        </div>

        <div className="col-lg-5">
          <h6 className="small fw-semibold text-uppercase text-muted">
            From the shared patient record
          </h6>
          <div className="small mb-2">
            <div className="fw-semibold">Allergies</div>
            {data.allergies.length === 0 ? (
              <div className="text-muted">No active allergy recorded.</div>
            ) : (
              <ul className="mb-0 ps-3">
                {data.allergies.map((allergy) => (
                  <li key={allergy.id}>
                    {allergy.title}
                    {allergy.reaction ? ` — ${allergy.reaction}` : ''}
                    {allergy.severity_al ? ` (${allergy.severity_al})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="small mb-2">
            <div className="fw-semibold">Current medications</div>
            {data.activeMedications.length === 0 ? (
              <div className="text-muted">No active prescription recorded.</div>
            ) : (
              <ul className="mb-0 ps-3">
                {data.activeMedications.map((med) => (
                  <li key={med.id}>
                    {med.drug || 'Unnamed medication'}
                    {med.dosage ? ` — ${med.dosage}` : ''}
                    {med.route ? ` ${med.route}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="small">
            <div className="fw-semibold">Previous stroke encounters</div>
            {data.priorStrokeEncounters.length === 0 ? (
              <div className="text-muted">No previous stroke encounter.</div>
            ) : (
              <ul className="mb-0 ps-3">
                {data.priorStrokeEncounters.map((encounter) => (
                  <li key={encounter.id}>
                    {formatWhen(encounter.arrival_at)} · {encounter.activation_code} ·{' '}
                    {encounter.stroke_type.replace('_', ' ')} · {encounter.status}
                    {encounter.nihss_total !== null
                      ? ` · NIHSS ${encounter.nihss_total}`
                      : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
