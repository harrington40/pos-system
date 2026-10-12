import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import nestClient from '../../api/nest-client';
import { patientChartPath } from '../../utils/patientChart';

const BOOKING_PATH = '/book-appointment';
const BOOKING_URL =
  typeof window !== 'undefined'
    ? `${window.location.origin}${BOOKING_PATH}`
    : `https://openrx.transtechologies.com${BOOKING_PATH}`;

/** A row from `GET /bookings/requests`. */
interface BookingRow {
  id: number;
  fname: string;
  lname: string;
  phone_contact: string;
  preferred_date: string;
  preferred_time?: string | null;
  reason?: string | null;
  source?: string | null;
  status: string;
  consultation_type?: string | null;
  video_room?: string | null;
  patient_id?: number | null;
  pid?: number | null;
}

export default function BookingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState('');

  const { data: bookings = [], isLoading } = useQuery<BookingRow[]>({
    queryKey: ['bookings-requests'],
    queryFn: async () => {
      const r = await nestClient.get('/bookings/requests');
      return r.data;
    },
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => nestClient.patch(`/bookings/requests/${id}/approve`, {}),
    onSuccess: (d: { data?: { publicId?: string } }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings-requests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['registrar', 'appointments'] });
      setToast(`Approved · patient ${d.data?.publicId || ''} scheduled`);
    },
  });

  const declineMutation = useMutation({
    mutationFn: (id: number) => nestClient.patch(`/bookings/requests/${id}/decline`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings-requests'] });
      setToast('Booking declined');
    },
  });

  const pending = (bookings || []).filter((b) => b.status === 'pending');
  const approved = (bookings || []).filter((b) => b.status === 'approved');
  const declined = (bookings || []).filter((b) => b.status === 'declined');

  const copyLink = () => {
    navigator.clipboard?.writeText(BOOKING_URL).then(() => setToast(t('booking.linkCopied')));
  };

  const statusBadge = (s: string) =>
    s === 'pending' ? 'bg-warning text-dark' : s === 'approved' ? 'bg-success' : 'bg-danger';

  const renderRow = (b: BookingRow) => (
    <tr key={b.id}>
      <td><strong>#{b.id}</strong></td>
      <td>{b.fname} {b.lname}</td>
      <td>{b.phone_contact}</td>
      <td>{String(b.preferred_date || '').slice(0, 10)} {b.preferred_time || ''}</td>
      <td>{b.reason || '—'}</td>
      <td>
        {b.consultation_type === 'video' ? (
          <span className="vc-gradient badge rounded-pill text-white fw-semibold"><span className="vc-live-dot me-1"></span>{t('booking.videoTag')}</span>
        ) : (
          <span className="badge rounded-pill bg-light text-dark border">{t('booking.inPersonTag')}</span>
        )}
      </td>
      <td><span className="badge rounded-pill text-capitalize">{b.source || 'social'}</span></td>
      <td><span className={`badge rounded-pill ${statusBadge(b.status)}`}>{t('booking.status.' + b.status, { defaultValue: b.status })}</span></td>
      <td className="text-nowrap">
        {b.consultation_type === 'video' && b.video_room && (
          <a className="vc-gradient btn btn-sm rounded-pill text-white fw-semibold me-1 border-0" target="_blank" rel="noreferrer"
            href={`/video/${b.video_room}?role=physician`}>
            <i className="bi bi-camera-video-fill me-1"></i>Join video
          </a>
        )}
        {b.status === 'pending' ? (
          <>
            <button className="btn btn-success btn-sm rounded-pill me-1" onClick={() => approveMutation.mutate(b.id)} disabled={approveMutation.isPending}>
              <i className="bi bi-check-lg"></i> Approve
            </button>
            <button className="btn btn-outline-danger btn-sm rounded-pill" onClick={() => declineMutation.mutate(b.id)} disabled={declineMutation.isPending}>
              <i className="bi bi-x-lg"></i> Decline
            </button>
          </>
        ) : b.pid ? (
          <a className="btn btn-outline-primary btn-sm rounded-pill" href={patientChartPath(b.patient_id, b.pid) || '#'}>
            <i className="bi bi-folder2-open me-1"></i>Chart
          </a>
        ) : (
          <span className="text-muted small">—</span>
        )}
      </td>
    </tr>
  );

  return (
    <div className="glass-page position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #f5faff 45%, #d1fae5 100%)', borderRadius: '20px', minHeight: '100vh', padding: '16px' }}>
      {toast && (
        <div className="alert alert-success py-2 small d-flex justify-content-between align-items-center">
          <span><i className="bi bi-check-circle me-1"></i>{toast}</span>
          <button className="btn-close btn-sm" onClick={() => setToast('')}></button>
        </div>
      )}

      <div className="rounded-4 p-4 mb-4 text-white" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #198754 60%, #00c9a7 100%)' }}>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h3 className="mb-1 fw-bold"><i className="bi bi-qr-code me-2"></i>{t('booking.listTitle')}</h3>
            <p className="mb-0 text-white text-opacity-75 small">
              {t('booking.summary', { pending: pending.length, approved: approved.length, declined: declined.length })}
            </p>
          </div>
          <button className="btn btn-light btn-sm rounded-pill" onClick={() => window.open(BOOKING_PATH, '_blank')}>
            <i className="bi bi-box-arrow-up-right me-1"></i>{t('booking.openBooking')}
          </button>
        </div>
      </div>

      {/* Share + QR */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-4 text-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(BOOKING_URL)}`}
                alt={t('booking.qrAlt')}
                className="img-fluid border rounded-3"
                style={{ maxWidth: '180px' }}
              />
              <div className="small text-muted mt-1">{t('booking.scanToBook')}</div>
            </div>
            <div className="col-md-8">
              <h6 className="fw-bold"><i className="bi bi-share me-2"></i>{t('booking.shareLink')}</h6>
              <div className="input-group mb-3">
                <input className="form-control form-control-sm" readOnly value={BOOKING_URL} />
                <button className="btn btn-outline-primary btn-sm" onClick={copyLink}><i className="bi bi-clipboard"></i></button>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <a className="btn btn-success btn-sm rounded-pill" target="_blank" rel="noreferrer"
                  href={`https://wa.me/?text=${encodeURIComponent(t('booking.waText', { url: BOOKING_URL }))}`}>
                  <i className="bi bi-whatsapp me-1"></i>WhatsApp
                </a>
                <a className="btn btn-primary btn-sm rounded-pill" target="_blank" rel="noreferrer"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(BOOKING_URL)}`}>
                  <i className="bi bi-facebook me-1"></i>Facebook
                </a>
                <a className="btn btn-dark btn-sm rounded-pill" target="_blank" rel="noreferrer"
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(BOOKING_URL)}&text=${encodeURIComponent(t('booking.tweetText'))}`}>
                  <i className="bi bi-twitter-x me-1"></i>X / Twitter
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: '520px', overflowY: 'auto' }}>
              <table className="table table-hover small mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>{t('booking.cols.ref')}</th><th>{t('booking.cols.patient')}</th><th>{t('booking.cols.phone')}</th><th>{t('booking.cols.preferred')}</th><th>{t('booking.cols.reason')}</th><th>{t('booking.cols.type')}</th><th>{t('booking.cols.source')}</th><th>{t('booking.cols.status')}</th><th>{t('booking.cols.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr><td colSpan={9} className="text-center text-muted py-4">{t('booking.empty')}</td></tr>
                  ) : (
                    [...pending, ...approved, ...declined].map(renderRow)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
