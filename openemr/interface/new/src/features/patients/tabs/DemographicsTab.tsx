import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import type { Patient } from '../../../types/patient';
import { updatePatient } from '../../../api/endpoints/patients';
import nestClient from '../../../api/nest-client';
import { useAuth } from '../../../hooks/useAuth';
import PhoneInput from '../../../components/shared/PhoneInput';
import CitySelect from '../../../components/shared/CitySelect';

interface Props {
  patient: Patient;
}

export default function DemographicsTab({ patient }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Check 30-day edit window + read-only nursing role
  const isNurse = user?.role === 'nurse';
  const regDate = patient.regdate ? new Date(patient.regdate) : null;
  const daysSinceReg = regDate ? Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const isLocked = (daysSinceReg > 30 && !isAdmin) || isNurse;

  const [form, setForm] = useState({
    fname: patient.fname || '',
    lname: patient.lname || '',
    mname: patient.mname || '',
    dob: patient.dob || '',
    sex: patient.sex || '',
    email: patient.email || '',
    phone: patient.phone || '',
    street: patient.street || '',
    city: patient.city || '',
    providerID: patient.provider || '',
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers-list'],
    queryFn: async () => { const r = await nestClient.get('/admin/users'); return r.data; },
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<Patient>) => updatePatient(String(patient.id ?? patient.uuid), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patient.uuid] });
    },
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-pencil-square me-2"></i>
          Edit Demographics
        </h5>
        {regDate && (
          <small className="text-muted">
            Registered: {regDate.toLocaleDateString()} ({daysSinceReg} days ago)
          </small>
        )}
      </div>
      <div className="card-body">
        {isLocked && (
          <div className="alert alert-warning py-2 mb-3 d-flex align-items-center gap-2">
            <i className="bi bi-lock-fill fs-5"></i>
            <div>
              <strong>Demographics Read-Only</strong><br/>
              <small>
                {isNurse
                  ? 'Registered nurses have read-only access to patient demographics.'
                  : 'Edits are restricted after 30 days from registration. Only an administrator can modify these fields.'}
              </small>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-control"
                value={form.fname}
                onChange={(e) => handleChange('fname', e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-control"
                value={form.lname}
                onChange={(e) => handleChange('lname', e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Middle Name</label>
              <input
                type="text"
                className="form-control"
                value={form.mname}
                onChange={(e) => handleChange('mname', e.target.value)}
                disabled={isLocked}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={form.dob}
                onChange={(e) => handleChange('dob', e.target.value)}
                disabled={isLocked}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Sex</label>
              <select
                className="form-select"
                value={form.sex}
                onChange={(e) => handleChange('sex', e.target.value)}
                disabled={isLocked}
              >
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={isLocked}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Phone</label>
              <PhoneInput value={form.phone} onChange={(v) => handleChange('phone', v)} disabled={isLocked} />
            </div>
            <div className="col-md-8 mb-3">
              <label className="form-label">Street</label>
              <input
                type="text"
                className="form-control"
                value={form.street}
                onChange={(e) => handleChange('street', e.target.value)}
                disabled={isLocked}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">City</label>
              <CitySelect value={form.city} onChange={(v) => handleChange('city', v)} disabled={isLocked} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Primary Care Provider</label>
              <select
                className="form-select"
                value={form.providerID}
                onChange={(e) => handleChange('providerID', e.target.value)}
                disabled={isLocked}
              >
                <option value="">— Select Provider —</option>
                {providers.filter((p: any) => p.active).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.title ? `${p.title} ` : ''}{p.fname} {p.lname}{p.specialty ? ` (${p.specialty})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="d-flex gap-2">
            {!isLocked && (
              <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-floppy me-1"></i>
                    Save Changes
                  </>
                )}
              </button>
            )}
            {mutation.isSuccess && (
              <span className="text-success align-self-center">
                <i className="bi bi-check-circle me-1"></i>
                Saved successfully
              </span>
            )}
            {mutation.isError && (
              <span className="text-danger align-self-center">
                <i className="bi bi-x-circle me-1"></i>
                Save failed
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
