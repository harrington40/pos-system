import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import nestClient from '../../api/nest-client';
import {
    clearConsoleSession,
    getConsoleToken,
    getConsoleUsername,
    hasConsoleSession,
    setConsoleSession,
} from './consoleSession';

interface Promotion {
    label: string;
    percentOff: number;
    tiers: string[];
    cycle: 'both' | 'monthly' | 'yearly';
    endsAt: string | null;
    code: string | null;
    note: string | null;
    active: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
}

const ALL_TIERS = ['basic', 'professional', 'enterprise'];

/** Selling points for the console's pitch block. */
const PITCH = [
    { icon: 'bi-shield-check', title: 'Offline licence validation', body: 'No internet needed after activation, so a licence server never blocks clinical work.' },
    { icon: 'bi-hospital', title: 'The whole clinic in one place', body: 'Patients, encounters, prescribing, labs, imaging and billing without add-ons.' },
    { icon: 'bi-hdd-network', title: 'Runs on modest hardware', body: 'On-premise friendly, with patient data staying on your own servers.' },
    { icon: 'bi-people', title: 'Every role covered', body: 'Physician, nurse, midwife, laboratory, pharmacy and front-desk dashboards included.' },
];

/** Payload shared by the promotion admin endpoints. */
interface AdminPayload {
    promotion?: Promotion | null;
    effective?: Promotion | null;
    message?: string;
}

/** Calls the admin endpoints with the console's own token, not the app session. */
async function consoleApi(
    path: string,
    method: 'GET' | 'PUT' | 'POST',
    body?: unknown,
): Promise<AdminPayload> {
    const token = getConsoleToken();
    // Relative base, exactly like nestClient (src/api/nest-client.ts): the SPA is
    // served from the same origin as the API. The old absolute
    // 'http://localhost:3002/api' fallback pointed at the *visitor's* own machine,
    // which is why the console opened but every request in it failed to fetch.
    const base = import.meta.env.VITE_API_URL ?? '/api';
    const response = await fetch(`${base}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        },
    );
    const text = await response.text();
    const payload = (text ? JSON.parse(text) : {}) as AdminPayload;
    if (!response.ok) {
        throw new Error(
            (payload as { message?: string })?.message || `HTTP ${response.status}`,
        );
    }
    return payload;
}

/** dd:hh:mm:ss to the end of the promotion, or null when there is no end date. */
function useCountdown(endsAt: string | null) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    if (!endsAt) return null;
    const target = new Date(endsAt).getTime();
    const remaining = target - now;
    const expired = remaining <= 0;
    const total = Math.max(0, remaining);
    return {
        expired,
        days: Math.floor(total / 86400000),
        hours: Math.floor((total % 86400000) / 3600000),
        minutes: Math.floor((total % 3600000) / 60000),
        seconds: Math.floor((total % 60000) / 1000),
    };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Compact remaining-time label, or null when there is no end date. */
function formatCountdown(c: ReturnType<typeof useCountdown>): string | null {
    if (!c) return null;
    if (c.expired) return 'Expired';
    return `${c.days}d ${pad(c.hours)}h ${pad(c.minutes)}m ${pad(c.seconds)}s`;
}

export default function LicenseConsolePage() {
    const navigate = useNavigate();
    const [unlocked, setUnlocked] = useState(() => hasConsoleSession());

    // Login gate
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [busy, setBusy] = useState(false);

    // Console state
    const [promotion, setPromotion] = useState<Promotion | null>(null);
    const [effective, setEffective] = useState<Promotion | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        label: 'Launch offer',
        percentOff: 25,
        tiers: ['professional', 'enterprise'] as string[],
        cycle: 'both' as 'both' | 'monthly' | 'yearly',
        endsAt: '',
        code: '',
        note: '',
    });

    const countdown = useCountdown(promotion?.endsAt ?? null);

    const load = useCallback(async () => {
        try {
            const data = await consoleApi('/license/promotion/admin', 'GET');
            setPromotion(data.promotion ?? null);
            setEffective(data.effective ?? null);
            if (data.promotion) {
                setForm({
                    label: data.promotion.label ?? 'Special offer',
                    percentOff: data.promotion.percentOff ?? 25,
                    tiers: data.promotion.tiers ?? ALL_TIERS,
                    cycle: data.promotion.cycle ?? 'both',
                    endsAt: data.promotion.endsAt
                        ? new Date(data.promotion.endsAt).toISOString().slice(0, 16)
                        : '',
                    code: data.promotion.code ?? '',
                    note: data.promotion.note ?? '',
                });
            }
        } catch (e) {
            const text = (e as Error).message;
            // An expired or foreign token must drop straight back to the gate.
            if (/401|403/.test(text)) {
                clearConsoleSession();
                setUnlocked(false);
            } else {
                setError(text);
            }
        }
    }, []);

    useEffect(() => {
        if (unlocked) void load();
    }, [unlocked, load]);

    const signIn = async () => {
        setBusy(true);
        setLoginError('');
        try {
            const response = await nestClient.post('/auth/login', {
                username,
                password,
            });
            const token = response.data?.token;
            const user = response.data?.user;
            // The role is checked here for a clear message, and again on the
            // server for every call - this check is courtesy, not security.
            if (!token || user?.role !== 'admin') {
                setLoginError('Administrator credentials are required.');
                return;
            }
            setConsoleSession(token, user.username ?? username);
            setPassword('');
            setUnlocked(true);
        } catch (e) {
            const err = e as { response?: { data?: { message?: string } } };
            setLoginError(err.response?.data?.message || 'Sign-in failed.');
        } finally {
            setBusy(false);
        }
    };

    const toggle = async (active: boolean) => {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const data = await consoleApi(
                '/license/promotion/admin/toggle',
                'POST',
                { active },
            );
            setPromotion(data.promotion ?? null);
            await load();
            setMessage(
                active
                    ? 'Discount is live — the pricing page is showing it now.'
                    : 'Discount switched off — the pricing page shows published prices.',
            );
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            await consoleApi('/license/promotion/admin', 'PUT', {
                label: form.label,
                percentOff: Number(form.percentOff),
                tiers: form.tiers,
                cycle: form.cycle,
                endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
                code: form.code || null,
                note: form.note || null,
            });
            await load();
            setMessage('Saved. Use the switch to put it live.');
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const signOut = () => {
        clearConsoleSession();
        setUnlocked(false);
        setPromotion(null);
        setEffective(null);
    };

    // ── The gate ──────────────────────────────────────────────────────
    if (!unlocked) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #020617 100%)' }}>
                <div className="card border-0 shadow-lg" style={{ maxWidth: '420px', width: '100%', borderRadius: '18px' }}>
                    <div className="card-body p-4">
                        <div className="text-center mb-3">
                            <i className="bi bi-shield-lock-fill" style={{ fontSize: '2rem', color: '#6f42c1' }}></i>
                            <h5 className="fw-bold mt-2 mb-0">Marketing console</h5>
                            <p className="text-muted small mb-0">
                                Administrator sign-in required. This is separate from
                                your OpenRx session.
                            </p>
                        </div>
                        <div className="mb-2">
                            <label className="form-label small fw-semibold">Username</label>
                            <input className="form-control" value={username} autoComplete="off"
                                name="openrx-console-user" onChange={(e) => setUsername(e.target.value)} />
                        </div>
                        <div className="mb-3">
                            <label className="form-label small fw-semibold">Password</label>
                            <input className="form-control" type="password" value={password}
                                name="openrx-console-pass" autoComplete="new-password" spellCheck={false}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') void signIn(); }} />
                        </div>
                        {loginError && <div className="alert alert-danger py-2 small">{loginError}</div>}
                        <button className="btn btn-primary w-100 fw-semibold" disabled={busy || !username || !password}
                            onClick={() => void signIn()}>
                            {busy ? 'Checking…' : 'Unlock console'}
                        </button>
                        <button className="btn btn-link w-100 btn-sm text-muted mt-2"
                            onClick={() => navigate('/license')}>
                            Back to licence page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const live = !!effective;
    const cardStyle = {
        background: '#111c33',
        border: '1px solid #1e2a44',
        borderRadius: '16px',
    };
    const countdownLabel = formatCountdown(countdown);

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0b1220 0%, #111c33 45%, #0b1220 100%)', color: '#e2e8f0', padding: '1.5rem' }}>
            <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
                    <div>
                        <div className="text-uppercase small" style={{ letterSpacing: '2px', color: '#8b9cc0' }}>
                            OpenRx · Marketing
                        </div>
                        <h2 className="fw-bold mb-0" style={{ color: 'white' }}>Promotion Console</h2>
                        <div className="small" style={{ color: '#8b9cc0' }}>
                            Signed in as {getConsoleUsername()}
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <NavLink to="/license" className="btn btn-outline-light btn-sm" target="_blank">
                            View pricing page
                        </NavLink>
                        <button className="btn btn-outline-danger btn-sm" onClick={signOut}>
                            <i className="bi bi-lock me-1"></i>Lock console
                        </button>
                    </div>
                </div>

                {message && <div className="alert alert-success py-2">{message}</div>}
                {error && <div className="alert alert-danger py-2">{error}</div>}

                <div className="row g-3 mb-3">
                    <div className="col-lg-7">
                        <div className="p-4 h-100" style={cardStyle}>
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <div className="small" style={{ color: '#8b9cc0' }}>Discount status</div>
                                    <h4 className="fw-bold mb-1" style={{ color: 'white' }}>
                                        {live
                                            ? `${promotion?.percentOff}% off — live`
                                            : promotion
                                              ? 'Configured, switched off'
                                              : 'Nothing configured yet'}
                                    </h4>
                                    <div className="small" style={{ color: '#8b9cc0' }}>
                                        {live
                                            ? 'Customers see this on the pricing page now.'
                                            : 'The pricing page shows published prices.'}
                                    </div>
                                </div>
                                <span className={`badge ${live ? 'bg-success' : 'bg-secondary'}`}>
                                    {live ? 'LIVE' : 'OFF'}
                                </span>
                            </div>

                            <div className="mt-4">
                                <button
                                    className={`btn fw-semibold ${promotion?.active ? 'btn-outline-warning' : 'btn-success'}`}
                                    disabled={busy || !promotion}
                                    onClick={() => void toggle(!promotion?.active)}
                                >
                                    <i className={`bi ${promotion?.active ? 'bi-pause-circle' : 'bi-lightning-charge-fill'} me-1`}></i>
                                    {promotion?.active ? 'Deactivate discount' : 'Activate discount'}
                                </button>
                                {!promotion && (
                                    <span className="small ms-3" style={{ color: '#8b9cc0' }}>
                                        Save a promotion first.
                                    </span>
                                )}
                            </div>

                            {promotion?.updatedAt && (
                                <div className="small mt-3" style={{ color: '#8b9cc0' }}>
                                    Changed by {promotion.updatedBy || 'unknown'} ·{' '}
                                    {new Date(promotion.updatedAt).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-lg-5">
                        <div className="p-4 h-100 text-center" style={cardStyle}>
                            <div className="small text-uppercase" style={{ letterSpacing: '2px', color: '#8b9cc0' }}>
                                Offer ends in
                            </div>
                            <div
                                className="fw-bold mt-3"
                                style={{
                                    color: countdown?.expired ? '#ffc107' : 'white',
                                    fontSize: '1.9rem',
                                }}
                            >
                                {countdownLabel ?? '—'}
                            </div>
                            {promotion?.endsAt ? (
                                <div className="small mt-2" style={{ color: '#8b9cc0' }}>
                                    {new Date(promotion.endsAt).toLocaleString()}
                                </div>
                            ) : (
                                <div className="small mt-2" style={{ color: '#8b9cc0' }}>
                                    Set an end date below to start the countdown.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-12">
                        <div className="p-4" style={cardStyle}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="fw-bold mb-0" style={{ color: 'white' }}>Promotion details</h5>
                                <span className="small" style={{ color: '#8b9cc0' }}>Saving does not switch it on</span>
                            </div>
                            <div className="row g-3">
                                <div className="col-md-5">
                                    <label className="form-label small" style={{ color: '#8b9cc0' }}>Headline</label>
                                    <input className="form-control" value={form.label}
                                        onChange={(e) => setForm({ ...form, label: e.target.value })} />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label small" style={{ color: '#8b9cc0' }}>% off</label>
                                    <input className="form-control" type="number" min={1} max={99} value={form.percentOff}
                                        onChange={(e) => setForm({ ...form, percentOff: Number(e.target.value) })} />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label small" style={{ color: '#8b9cc0' }}>Billing</label>
                                    <select className="form-select" value={form.cycle}
                                        onChange={(e) => setForm({ ...form, cycle: e.target.value as 'both' | 'monthly' | 'yearly' })}>
                                        <option value="both">Both</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label small" style={{ color: '#8b9cc0' }}>Ends</label>
                                    <input className="form-control" type="datetime-local" value={form.endsAt}
                                        onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small" style={{ color: '#8b9cc0' }}>Promo code</label>
                                    <input className="form-control" value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="col-md-8">
                                    <label className="form-label small" style={{ color: '#8b9cc0' }}>Supporting line</label>
                                    <input className="form-control" value={form.note}
                                        onChange={(e) => setForm({ ...form, note: e.target.value })} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label small" style={{ color: '#8b9cc0' }}>Plans covered</label>
                                    <div className="d-flex gap-4">
                                        {ALL_TIERS.map((tier) => (
                                            <div className="form-check" key={tier}>
                                                <input className="form-check-input" type="checkbox" id={`tier-${tier}`}
                                                    checked={form.tiers.includes(tier)}
                                                    onChange={(e) => setForm({
                                                        ...form,
                                                        tiers: e.target.checked
                                                            ? [...form.tiers, tier]
                                                            : form.tiers.filter((t) => t !== tier),
                                                    })} />
                                                <label className="form-check-label text-capitalize small" htmlFor={`tier-${tier}`}>
                                                    {tier}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-primary fw-semibold mt-3" disabled={busy} onClick={() => void save()}>
                                <i className="bi bi-save me-1"></i>Save promotion
                            </button>
                        </div>
                    </div>

                    <div className="col-12">
                        <div className="p-4" style={cardStyle}>
                            <h5 className="fw-bold mb-1" style={{ color: 'white' }}>Why clinics choose OpenRx</h5>
                            <p className="small mb-3" style={{ color: '#8b9cc0' }}>
                                The promotion lowers the barrier — the product does the rest.
                            </p>
                            <div className="row g-3">
                                {PITCH.map((point) => (
                                    <div className="col-md-6" key={point.title}>
                                        <div className="d-flex gap-3">
                                            <i className={`bi ${point.icon} fs-4`} style={{ color: '#22c55e' }}></i>
                                            <div>
                                                <div className="fw-semibold" style={{ color: 'white' }}>{point.title}</div>
                                                <div className="small" style={{ color: '#8b9cc0' }}>{point.body}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

