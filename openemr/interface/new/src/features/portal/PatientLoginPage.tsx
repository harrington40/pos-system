import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import nestClient from '../../api/nest-client';

export default function PatientLoginPage() {
  const navigate = useNavigate();
  const [pid, setPid] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await nestClient.post('/portal/login', { publicId: pid.trim(), dob: dob || undefined });
      const patient = res.data;
      localStorage.setItem('portal_patient', JSON.stringify({ pid: patient.pid, name: patient.name, dob: patient.dob, token: patient.token }));
      navigate('/portal/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Patient not found. Please check your Patient ID.');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a2540 0%, #0d6efd 45%, #00c9a7 100%)' }}>
      <div className="position-absolute rounded-circle" style={{ width: '360px', height: '360px', top: '-100px', left: '-80px', background: 'radial-gradient(circle, rgba(0,201,167,0.45), transparent 70%)', filter: 'blur(18px)' }}></div>
      <div className="position-absolute rounded-circle" style={{ width: '420px', height: '420px', bottom: '-120px', right: '-100px', background: 'radial-gradient(circle, rgba(13,110,253,0.45), transparent 70%)', filter: 'blur(18px)' }}></div>
      <div className="card shadow position-relative" style={{ width: '400px', borderRadius: '24px', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.6)' }}>
        <div className="card-body p-4 text-center">
          <div className="mb-4">
            <i className="bi bi-heart-pulse text-success" style={{ fontSize: '3rem' }}></i>
            <h2 className="mt-2">Patient Portal</h2>
            <p className="text-muted">Access your health records</p>
          </div>
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="mb-3 text-start">
              <label className="form-label">Patient ID</label>
              <input type="text" className="form-control" value={pid} onChange={e => setPid(e.target.value)} placeholder="Enter your patient ID" required />
            </div>
            <div className="mb-3 text-start">
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-control" value={dob} onChange={e => setDob(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-success btn-lg w-100">Sign In</button>
          </form>
          <div className="mt-3 d-flex justify-content-between">
            <Link to="/portal/register" className="small text-success">New Patient? Register</Link>
            <Link to="/login" className="small text-muted">Staff Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
