import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchPatients } from '../../api/endpoints/patients';
import { createAppointment } from '../../api/endpoints/appointments';
import type { AppointmentCreatePayload } from '../../types/appointment';
import { useDebounce } from '../../hooks/useDebounce';
import nestClient from '../../api/nest-client';
import { formatDateOnly } from '../../utils/date';

interface Props {
  selectedDate: string;
  onClose: () => void;
}

export default function AppointmentCreateModal({ selectedDate, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [form, setForm] = useState({
    pc_title: '',
    pc_hometext: '',
    pc_startTime: '09:00',
    pc_duration: 30,
    pc_apptstatus: 'Scheduled',
    pc_catid: 5, // default "Office Visit" category
    pc_facility: 1,
    pc_billing_location: 1,
    pc_aid: 1,
  });
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifySms, setNotifySms] = useState(false);

  const { data: openSlots = [] } = useQuery({
    queryKey: ['open-slots', selectedDate],
    queryFn: async () => { const r = await nestClient.get('/appointments/open-slots', { params: { date: selectedDate } }); return r.data; },
  });

  const debouncedSearch = useDebounce(patientSearch, 300);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'search', debouncedSearch],
    queryFn: () => searchPatients({ search: debouncedSearch, limit: 10 }),
    enabled: debouncedSearch.length >= 2,
  });

  const mutation = useMutation({
    mutationFn: (data: AppointmentCreatePayload) =>
      createAppointment(selectedPatientId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    // Create the appointment
    mutation.mutate({
      ...form,
      pc_eventDate: selectedDate,
    });

    // Send notification messages
    if (notifyEmail || notifySms) {
      const methods = [];
      if (notifyEmail) methods.push('Email');
      if (notifySms) methods.push('SMS');
      try {
        await nestClient.post('/messages', {
          title: `Appointment: ${form.pc_title || 'Visit'}`,
          body: `Appointment scheduled for ${selectedDate} at ${form.pc_startTime}. Patient: ${selectedPatientName}. Notify via: ${methods.join(', ')}.`,
          pid: selectedPatientId,
        });
      } catch { /* silent */ }
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-plus-circle me-2"></i>
              {t('appointments.create.title')}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Patient search */}
              <div className="mb-3">
                <label className="form-label">{t('appointments.create.patient')}</label>
                {selectedPatientId ? (
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>{selectedPatientName}</strong>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setSelectedPatientId(null);
                        setSelectedPatientName('');
                        setPatientSearch('');
                      }}
                    >
                      {t('appointments.create.change')}
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={t('appointments.create.searchPlaceholder')}
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                    {debouncedSearch.length >= 2 && (
                      <div className="list-group mt-1" style={{ maxHeight: '150px', overflow: 'auto' }}>
                        {patients.map((p) => (
                          <button
                            key={(p as any).id || p.uuid}
                            type="button"
                            className="list-group-item list-group-item-action py-1"
                            onClick={() => {
                              setSelectedPatientId((p as any).id || p.uuid);
                              setSelectedPatientName(`${p.lname}, ${p.fname}`);
                              setPatientSearch('');
                            }}
                          >
                            {p.lname}, {p.fname} — {formatDateOnly(p.dob)}
                          </button>
                        ))}
                        {patients.length === 0 && (
                          <div className="list-group-item text-muted small">{t('appointments.create.noPatients')}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Open slots */}
              {openSlots.length > 0 && selectedPatientId && (
                <div className="mb-3">
                  <label className="form-label small">{t('appointments.create.availableSlots')}</label>
                  <div className="d-flex flex-wrap gap-1">
                    {openSlots.map((s: any) => (
                      <button key={s.time} type="button" className={`btn btn-sm ${form.pc_startTime === s.time ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setForm({...form, pc_startTime: s.time})}>{s.time}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date and time */}
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">{t('appointments.create.date')}</label>
                  <input type="date" className="form-control" value={selectedDate} disabled />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">{t('appointments.create.startTime')}</label>
                  <input
                    type="time"
                    className="form-control"
                    value={form.pc_startTime}
                    onChange={(e) => setForm({ ...form, pc_startTime: e.target.value })}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">{t('appointments.create.duration')}</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.pc_duration}
                    min={5}
                    step={5}
                    onChange={(e) => setForm({ ...form, pc_duration: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>

              {/* Recurring + Notifications */}
              <div className="row mb-3">
                <div className="col-md-4">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} id="recurring" />
                    <label className="form-check-label small" htmlFor="recurring">{t('appointments.create.recurringWeekly')}</label>
                    {recurring && <input type="number" className="form-control form-control-sm mt-1" min={1} max={52} value={recurringWeeks} onChange={e => setRecurringWeeks(+e.target.value)} placeholder={t('appointments.create.weeksPlaceholder')} />}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-check"><input className="form-check-input" type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} id="notifyEmail" /><label className="form-check-label small" htmlFor="notifyEmail">{t('appointments.create.emailNotification')}</label></div>
                </div>
                <div className="col-md-4">
                  <div className="form-check"><input className="form-check-input" type="checkbox" checked={notifySms} onChange={e => setNotifySms(e.target.checked)} id="notifySms" /><label className="form-check-label small" htmlFor="notifySms">{t('appointments.create.smsNotification')}</label></div>
                </div>
              </div>

              {/* Title and status */}
              <div className="row">
                <div className="col-md-8 mb-3">
                  <label className="form-label">{t('appointments.create.titleLabel')}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.pc_title}
                    onChange={(e) => setForm({ ...form, pc_title: e.target.value })}
                    required
                    placeholder={t('appointments.create.titlePlaceholder')}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">{t('common.status')}</label>
                  <select
                    className="form-select"
                    value={form.pc_apptstatus}
                    onChange={(e) => setForm({ ...form, pc_apptstatus: e.target.value })}
                  >
                    <option value="Scheduled">{t('appointments.status.Scheduled')}</option>
                    <option value="Pending">{t('appointments.status.Pending')}</option>
                    <option value="Checked In">{t('appointments.status.Checked In')}</option>
                    <option value="Canceled">{t('appointments.status.Canceled')}</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-3">
                <label className="form-label">{t('appointments.create.notes')}</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.pc_hometext}
                  onChange={(e) => setForm({ ...form, pc_hometext: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedPatientId || mutation.isPending}
              >
                {mutation.isPending ? t('appointments.create.creating') : t('appointments.create.submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
