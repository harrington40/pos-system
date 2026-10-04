import { useState } from 'react';
import nestClient from '../../api/nest-client';

const REASONS = ['General appointment', 'Consultation', 'Lab work', 'Vaccination', 'Follow-up', 'Maternity', 'Other'];

const CONSULT_OPTIONS = [
  { value: 'in_person', label: 'In person', desc: 'Visit the clinic for your care', icon: 'bi-building' },
  { value: 'video', label: 'Video call', desc: 'Meet your doctor online', icon: 'bi-camera-video' },
];

export default function BookAppointmentPage() {
  const [form, setForm] = useState({
    fname: '',
    lname: '',
    phone_contact: '',
    email: '',
    preferred_date: '',
    preferred_time: '09:00',
    reason: 'General appointment',
    consultation_type: 'in_person',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<{
    id: number;
    consultation_type?: string;
    video_room?: string | null;
  } | null>(null);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const r = await nestClient.post('/booking/request', { ...form, source: 'whatsapp' });
      setConfirmed(r.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not submit your booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="position-relative min-vh-100 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1e3b 0%, #123a6d 35%, #0d6efd 70%, #00c9a7 100%)' }}>
      {/* Decorative blobs */}
      <div className="position-absolute rounded-circle" style={{ width: '420px', height: '420px', top: '-120px', right: '-80px', background: 'radial-gradient(circle, rgba(0,201,167,0.55), transparent 70%)', filter: 'blur(30px)' }}></div>
      <div className="position-absolute rounded-circle" style={{ width: '380px', height: '380px', bottom: '-100px', left: '-120px', background: 'radial-gradient(circle, rgba(13,110,253,0.55), transparent 70%)', filter: 'blur(30px)' }}></div>
      <div className="position-absolute rounded-circle" style={{ width: '260px', height: '260px', top: '40%', left: '35%', background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)', filter: 'blur(26px)' }}></div>

      <div className="container position-relative py-4 py-md-5" style={{ zIndex: 1 }}>
        <div className="row g-4 align-items-center justify-content-center">
          {/* Marketing / info column */}
          <div className="col-lg-5">
            <div className="text-white pe-lg-4">
              <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-10 border border-white border-opacity-25 rounded-pill px-3 py-2 mb-4">
                <i className="bi bi-calendar2-check"></i>
                <span className="small fw-semibold">OpenRx Online Booking</span>
              </div>
              <h1 className="display-5 fw-bold mb-3" style={{ lineHeight: 1.15 }}>
                Book your visit in <span style={{ color: '#7ff5df' }}>minutes</span>, not hours.
              </h1>
              <p className="text-white text-opacity-75 mb-4" style={{ fontSize: '1.05rem' }}>
                Request an appointment from anywhere — WhatsApp, Facebook, X, or the link we share.
                Choose an in-person visit or a secure video consultation with your physician.
              </p>

              <div className="d-flex flex-column gap-3 mb-4">
                {[
                  { icon: 'bi-pencil-square', title: '1 · Request a slot', desc: 'Tell us your name, phone, and preferred date.' },
                  { icon: 'bi-check2-circle', title: '2 · We confirm', desc: 'Our registrar verifies and schedules you with a provider.' },
                  { icon: 'bi-heart-pulse', title: '3 · Come in for care', desc: 'Vitals are taken on arrival, then you see your doctor.' },
                ].map(s => (
                  <div key={s.title} className="d-flex gap-3 align-items-start">
                    <div className="rounded-circle bg-white bg-opacity-10 border border-white border-opacity-25 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '46px', height: '46px' }}>
                      <i className={`bi ${s.icon} fs-5`}></i>
                    </div>
                    <div>
                      <div className="fw-bold">{s.title}</div>
                      <div className="small text-white text-opacity-75">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-flex flex-wrap gap-3 small">
                <span className="d-inline-flex align-items-center gap-1"><i className="bi bi-shield-lock"></i> Private & secure</span>
                <span className="d-inline-flex align-items-center gap-1"><i className="bi bi-lightning-charge"></i> Fast confirmation</span>
                <span className="d-inline-flex align-items-center gap-1"><i className="bi bi-whatsapp"></i> WhatsApp friendly</span>
              </div>

              <div className="mt-4 p-3 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-25">
                <div className="fw-semibold mb-1"><i className="bi bi-headset me-2"></i>Need help?</div>
                <div className="small text-white text-opacity-75">
                  WhatsApp / call us, or email <span className="text-white fw-semibold">dev@transtechologies.com</span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking form column */}
          <div className="col-lg-6 col-xl-5">
            <div className="card border-0 shadow-lg" style={{ borderRadius: '24px', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(18px)' }}>
              <div className="card-body p-4 p-md-5">
                {confirmed ? (
                  <div className="text-center py-4">
                    <div className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '84px', height: '84px' }}>
                      <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                    </div>
                    <h4 className="fw-bold">Request received</h4>
                    <p className="text-muted small mb-1">Booking reference <span className="badge bg-primary rounded-pill">#{confirmed.id}</span></p>
                    <p className="text-muted small mb-4">We will contact you on WhatsApp or phone to confirm your appointment.</p>
                    {confirmed.consultation_type === 'video' && confirmed.video_room && (
                      <div className="alert alert-info text-start small mb-4">
                        <div className="fw-semibold mb-1"><i className="bi bi-camera-video me-1"></i>Video consultation requested</div>
                        <p className="mb-2">Save this private link — you and your physician join here at your appointment time.</p>
                        <div className="input-group input-group-sm mb-2">
                          <input className="form-control" readOnly value={`${window.location.origin}/video/${confirmed.video_room}`} />
                          <button className="btn btn-outline-primary" type="button"
                            onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/video/${confirmed.video_room}`)}>
                            <i className="bi bi-clipboard"></i>
                          </button>
                        </div>
                        <a className="btn btn-primary btn-sm rounded-pill" href={`/video/${confirmed.video_room}`}>
                          <i className="bi bi-camera-video-fill me-1"></i>Join video room now
                        </a>
                      </div>
                    )}
                    <button className="btn btn-outline-primary rounded-pill px-4" onClick={() => setConfirmed(null)}>
                      <i className="bi bi-plus-lg me-1"></i>Make another booking
                    </button>
                  </div>
                ) : (
                  <>
                    <h4 className="fw-bold mb-1 text-center"><i className="bi bi-calendar-plus me-2 text-primary"></i>Book an Appointment</h4>
                    <p className="text-muted small text-center mb-4">Fill in your details — confirmation takes minutes.</p>

                    {error && <div className="alert alert-danger py-2 small"><i className="bi bi-exclamation-triangle me-1"></i>{error}</div>}

                    <form onSubmit={handleSubmit}>
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label small fw-semibold">Consultation type</label>
                          <div className="row g-2">
                            {CONSULT_OPTIONS.map(o => (
                              <div className="col-6" key={o.value}>
                                <button
                                  type="button"
                                  className={`w-100 btn ${form.consultation_type === o.value ? 'btn-primary' : 'btn-outline-secondary'} text-start rounded-3 py-2`}
                                  onClick={() => update('consultation_type', o.value)}
                                >
                                  <i className={`bi ${o.icon} me-2`}></i>
                                  <span className="fw-semibold">{o.label}</span>
                                  <div className={`small ${form.consultation_type === o.value ? 'text-white-50' : 'text-muted'}`}>{o.desc}</div>
                                </button>
                              </div>
                            ))}
                          </div>
                          {form.consultation_type === 'video' && (
                            <div className="form-text small"><i className="bi bi-info-circle me-1"></i>We will send you a private video link to join at your appointment time.</div>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">First name *</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0"><i className="bi bi-person"></i></span>
                            <input className="form-control border-start-0" value={form.fname} onChange={e => update('fname', e.target.value)} required />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Last name *</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0"><i className="bi bi-person"></i></span>
                            <input className="form-control border-start-0" value={form.lname} onChange={e => update('lname', e.target.value)} required />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Phone / WhatsApp *</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0"><i className="bi bi-whatsapp text-success"></i></span>
                            <input className="form-control border-start-0" type="tel" placeholder="0770 123 456" value={form.phone_contact} onChange={e => update('phone_contact', e.target.value)} required />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Email (optional)</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0"><i className="bi bi-envelope"></i></span>
                            <input className="form-control border-start-0" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Preferred date *</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0"><i className="bi bi-calendar3"></i></span>
                            <input className="form-control border-start-0" type="date" value={form.preferred_date} onChange={e => update('preferred_date', e.target.value)} required min={new Date().toISOString().split('T')[0]} />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Preferred time</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0"><i className="bi bi-clock"></i></span>
                            <input className="form-control border-start-0" type="time" value={form.preferred_time} onChange={e => update('preferred_time', e.target.value)} />
                          </div>
                        </div>
                        <div className="col-12">
                          <label className="form-label small fw-semibold">Reason for visit</label>
                          <div className="d-flex flex-wrap gap-2 mb-2">
                            {REASONS.map(r => (
                              <button
                                key={r}
                                type="button"
                                className={`btn btn-sm rounded-pill ${form.reason === r ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => update('reason', r)}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                          <textarea className="form-control" rows={2} placeholder="Anything else we should know…" value={form.reason === 'Other' ? '' : form.reason} onChange={e => update('reason', e.target.value)} />
                        </div>
                      </div>
                      <button className="btn btn-primary btn-lg rounded-pill w-100 mt-4 py-3 fw-semibold" disabled={submitting}>
                        {submitting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-send me-2"></i>}
                        Request Appointment
                      </button>
                      <p className="text-muted text-center small mt-3 mb-0">
                        <i className="bi bi-shield-lock me-1"></i>Your details are used only to schedule your visit.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
