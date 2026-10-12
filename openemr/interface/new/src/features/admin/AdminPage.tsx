import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import nestClient from '../../api/nest-client';
import PhoneInput from '../../components/shared/PhoneInput';

type TabId = 'users' | 'facilities' | 'lists' | 'notifications' | 'chart-tracking' | 'settings' | 'pending' | 'menu-access';

export default function AdminPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('users');

  return (
    <div className="glass-page position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #f5faff 45%, #d1fae5 100%)', borderRadius: '20px', minHeight: '100vh', padding: '16px' }}>
      <div className="position-absolute rounded-circle" style={{ width: '320px', height: '320px', top: '-90px', right: '-70px', background: 'radial-gradient(circle, rgba(13,110,253,0.30), transparent 70%)', filter: 'blur(20px)', zIndex: 0 }}></div>
      <div className="position-absolute rounded-circle" style={{ width: '380px', height: '380px', bottom: '8%', left: '-120px', background: 'radial-gradient(circle, rgba(0,201,167,0.30), transparent 70%)', filter: 'blur(20px)', zIndex: 0 }}></div>
      <style>{`
        .glass-page .card {
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,0.60) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.9) !important;
          box-shadow: 0 22px 45px rgba(10,37,64,0.20), 0 6px 14px rgba(10,37,64,0.10) !important;
          transition: transform .25s ease, box-shadow .25s ease, background .25s ease;
        }
        .glass-page .card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.70) !important;
          box-shadow: 0 30px 60px rgba(10,37,64,0.28), 0 10px 20px rgba(10,37,64,0.14) !important;
        }
        .glass-page .card .card-header,
        .glass-page .card-header {
          background: rgba(255,255,255,0.35) !important;
          border-bottom: 1px solid rgba(255,255,255,0.6) !important;
        }
        .glass-page .table thead.table-light {
          background: rgba(255,255,255,0.35) !important;
        }
        .glass-page .nav-tabs .nav-link {
          color: #33475b;
          border: 1px solid transparent;
          border-radius: 10px;
          margin-right: 4px;
          transition: all .2s ease;
        }
        .glass-page .nav-tabs .nav-link:hover {
          background: rgba(255,255,255,0.7);
          box-shadow: 0 6px 14px rgba(10,37,64,0.10);
        }
        .glass-page .nav-tabs .nav-link.active {
          background: linear-gradient(90deg, rgba(13,110,253,0.14), rgba(0,201,167,0.16));
          color: #0d6efd;
          border-color: rgba(13,110,253,0.25);
        }
      `}</style>

      <div className="rounded-4 p-4 mb-4 text-white position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #198754 60%, #0dcaf0 100%)', zIndex: 1 }}>
        <div className="position-absolute end-0 top-0 opacity-10" style={{ fontSize: '7rem', transform: 'rotate(10deg) translate(20px,-15px)' }}><i className="bi bi-gear-wide-connected"></i></div>
        <div className="position-relative d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h3 className="mb-1 fw-bold"><i className="bi bi-gear-wide-connected me-2"></i>{t('admin.page.title')}</h3>
            <p className="mb-0 text-white text-opacity-75 small">{t('admin.page.subtitle')}</p>
          </div>
        </div>
      </div>

      <ul className="nav nav-tabs mb-4 position-relative" style={{ zIndex: 1 }}>
        {[
          { id: 'pending' as TabId, label: t('admin.page.tabs.pending'), icon: 'bi-hourglass-split' },
          { id: 'users' as TabId, label: t('admin.page.tabs.users'), icon: 'bi-people' },
          { id: 'facilities' as TabId, label: t('admin.page.tabs.facilities'), icon: 'bi-building' },
          { id: 'lists' as TabId, label: t('admin.page.tabs.lists'), icon: 'bi-list-ul' },
          { id: 'notifications' as TabId, label: t('admin.page.tabs.notifications'), icon: 'bi-bell' },
          { id: 'chart-tracking' as TabId, label: t('admin.page.tabs.chart-tracking'), icon: 'bi-folder2' },
          { id: 'settings' as TabId, label: t('admin.page.tabs.settings'), icon: 'bi-sliders' },
          { id: 'menu-access' as TabId, label: t('admin.page.tabs.menu-access'), icon: 'bi-menu-button-wide' },
        ].map(tab => (
          <li className="nav-item" key={tab.id}>
            <button className={`nav-link ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <i className={`bi ${tab.icon} me-1`}></i>{tab.label}
            </button>
          </li>
        ))}
      </ul>

      {activeTab === 'pending' && <PendingRegistrationsTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'facilities' && <FacilitiesTab />}
      {activeTab === 'lists' && <ListsTab />}
      {activeTab === 'notifications' && <NotificationSettingsTab />}
      {activeTab === 'chart-tracking' && <ChartTrackingTab />}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'menu-access' && <MenuAccessTab />}
    </div>
  );
}

function UsersTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ username: '', fname: '', lname: '' });

  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: async () => { const r = await nestClient.get('/admin/users'); return r.data; } });

  const createUser = useMutation({
    mutationFn: (d: any) => nestClient.post('/admin/users', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setForm({ username: '', fname: '', lname: '' }); },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: number }) => nestClient.put(`/admin/users/${id}`, { active: active ? 0 : 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const toggleChartView = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => nestClient.put(`/admin/users/${id}/chart-view-privilege`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const toggleEditProviders = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => nestClient.put(`/admin/users/${id}/provider-edit-privilege`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const toggleEditCharges = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => nestClient.put(`/admin/users/${id}/charge-edit-privilege`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const roleLabel = (role: string, tr: (key: string) => string) => {
    switch (role) {
      case 'admin': return { label: tr('admin.page.roles.admin'), color: 'danger' };
      case 'front_office': return { label: tr('admin.page.roles.front_office'), color: 'info' };
      case 'standard': return { label: tr('admin.page.roles.standard'), color: 'primary' };
      case 'nurse': return { label: tr('admin.page.roles.nurse'), color: 'success' };
      case 'billing': return { label: tr('admin.page.roles.billing'), color: 'warning' };
      case 'inventory_manager': return { label: tr('admin.page.roles.inventory_manager'), color: 'success' };
      default: return { label: role || '—', color: 'secondary' };
    }
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="card-header"><h5 className="mb-0">{t('admin.page.addUser')}</h5></div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-3"><input className="form-control form-control-sm" placeholder={t('admin.page.usernamePlaceholder')} value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
            <div className="col-md-3"><input className="form-control form-control-sm" placeholder={t('admin.page.firstNamePlaceholder')} value={form.fname} onChange={e => setForm({...form, fname: e.target.value})} /></div>
            <div className="col-md-3"><input className="form-control form-control-sm" placeholder={t('admin.page.lastNamePlaceholder')} value={form.lname} onChange={e => setForm({...form, lname: e.target.value})} /></div>
            <div className="col-md-3"><button className="btn btn-primary btn-sm w-100" onClick={() => createUser.mutate(form)} disabled={createUser.isPending || !form.username}>{t('admin.page.createUser')}</button></div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h6 className="mb-0"><i className="bi bi-people me-2"></i>{t('admin.page.allUsers', { count: users.length })}</h6>
          <small className="text-muted">{t('admin.page.toggleHint')}</small>
        </div>
        <div className="card-body p-0">
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>{t('admin.page.cols.id')}</th><th>{t('admin.page.cols.username')}</th><th>{t('admin.page.cols.name')}</th><th>{t('admin.page.cols.role')}</th><th>{t('admin.page.cols.active')}</th>
                  <th className="text-center">{t('admin.page.cols.chartView')}</th>
                  <th className="text-center">{t('admin.page.cols.editProviders')}</th>
                  <th className="text-center">{t('admin.page.cols.editCharges')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => {
                  const rl = roleLabel(u.main_menu_role, (key: string) => t(key));
                  return (
                    <tr key={u.id}>
                      <td className="text-muted small">{u.id}</td>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.fname} {u.lname}</td>
                      <td><span className={`badge bg-${rl.color}`}>{rl.label}</span></td>
                      <td>
                        <span className={`badge ${u.active ? 'bg-success' : 'bg-secondary'}`}>
                          {u.active ? t('admin.page.active') : t('admin.page.inactive')}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="form-check form-switch d-inline-block mb-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            checked={u.can_view_charts === 1}
                            onChange={() => toggleChartView.mutate({ id: u.id, enabled: u.can_view_charts !== 1 })}
                            disabled={toggleChartView.isPending}
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="form-check form-switch d-inline-block mb-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            checked={u.can_edit_providers === 1}
                            onChange={() => toggleEditProviders.mutate({ id: u.id, enabled: u.can_edit_providers !== 1 })}
                            disabled={toggleEditProviders.isPending}
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="form-check form-switch d-inline-block mb-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            checked={u.can_edit_charges === 1}
                            onChange={() => toggleEditCharges.mutate({ id: u.id, enabled: u.can_edit_charges !== 1 })}
                            disabled={toggleEditCharges.isPending}
                            title={t('admin.page.chargePrivilegeHint')}
                          />
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => toggleActive.mutate({ id: u.id, active: u.active })}
                        >
                          {u.active ? t('admin.page.deactivate') : t('admin.page.activate')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-muted py-3">{t('admin.page.noUsers')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function FacilitiesTab() {
  const { t } = useTranslation();
  const { data: facilities = [] } = useQuery({ queryKey: ['facilities'], queryFn: async () => { const r = await nestClient.get('/facilities'); return r.data; } });

  return (
    <div className="card">
      <div className="card-header"><h5 className="mb-0">Facilities ({facilities.length})</h5></div>
      <div className="card-body p-0">
        <table className="table table-sm table-hover mb-0">
          <thead><tr><th>{t('admin.page.cols.id')}</th><th>{t('admin.page.facilityCols.name')}</th><th>{t('admin.page.facilityCols.phone')}</th><th>{t('admin.page.facilityCols.address')}</th></tr></thead>
          <tbody>
            {facilities.map((f: any) => (
              <tr key={f.id}><td>{f.id}</td><td><strong>{f.name}</strong></td><td>{f.phone || '—'}</td>
                <td>{[f.street, f.city].filter(Boolean).join(', ') || '—'}</td></tr>
            ))}
            {!facilities.length && <tr><td colSpan={4} className="text-muted text-center">{t('admin.page.noFacilities')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListsTab() {
  const { t } = useTranslation();
  const { data: lists = [] } = useQuery({
    queryKey: ['admin-lists'],
    queryFn: async () => { const r = await nestClient.get('/admin/lists'); return r.data; },
  });

  return (
    <div className="card">
      <div className="card-header"><h5 className="mb-0">{t('admin.page.lookupLists')}</h5></div>
      <div className="card-body p-0">
        <table className="table table-sm table-hover mb-0">
          <thead><tr><th>{t('admin.page.cols.id')}</th><th>{t('admin.page.listCols.type')}</th><th>{t('admin.page.listCols.title')}</th><th>{t('admin.page.listCols.date')}</th></tr></thead>
          <tbody>
            {lists.map((l: any) => (
              <tr key={l.id}><td>{l.id}</td><td><span className="badge bg-secondary">{l.type}</span></td><td>{l.title}</td><td>{l.date}</td></tr>
            ))}
            {!lists.length && <tr><td colSpan={4} className="text-muted text-center">{t('admin.page.noLists')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotificationSettingsTab() {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    smtp_host: 'mail.transtechologies.com', smtp_port: '587', smtp_user: 'support@transtechologies.com', smtp_pass: 'Cosinesine900**',
    sms_gateway: '', from_email: 'support@transtechologies.com', from_name: 'OpenRx Clinic',
  });

  const handleSave = () => {
    localStorage.setItem('openemr_notification_config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Load saved config on mount
  useState(() => {
    try {
      const saved2 = localStorage.getItem('openemr_notification_config');
      if (saved2) setConfig(JSON.parse(saved2));
    } catch { /* ignore */ }
  });

  return (
    <div>
      <div className="row g-4">
        {/* Email (SMTP) */}
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-header"><h5 className="mb-0"><i className="bi bi-envelope me-2"></i>{t('admin.page.emailSmtp')}</h5></div>
            <div className="card-body">
              <div className="mb-2"><label className="form-label small">{t('admin.page.smtpHost')}</label><input className="form-control form-control-sm" placeholder="smtp.gmail.com" value={config.smtp_host} onChange={e => setConfig({...config, smtp_host: e.target.value})} /></div>
              <div className="mb-2"><label className="form-label small">{t('admin.page.port')}</label><input className="form-control form-control-sm" value={config.smtp_port} onChange={e => setConfig({...config, smtp_port: e.target.value})} /></div>
              <div className="mb-2"><label className="form-label small">{t('admin.page.username')}</label><input className="form-control form-control-sm" value={config.smtp_user} onChange={e => setConfig({...config, smtp_user: e.target.value})} /></div>
              <div className="mb-2"><label className="form-label small">{t('admin.page.password')}</label><input className="form-control form-control-sm" type="password" value={config.smtp_pass} onChange={e => setConfig({...config, smtp_pass: e.target.value})} /></div>
              <div className="mb-2"><label className="form-label small">{t('admin.page.fromEmail')}</label><input className="form-control form-control-sm" placeholder={t('admin.page.emailPlaceholder')} value={config.from_email} onChange={e => setConfig({...config, from_email: e.target.value})} /></div>
            </div>
          </div>
        </div>

        {/* SMS Gateway */}
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-header"><h5 className="mb-0"><i className="bi bi-chat-dots me-2"></i>{t('admin.page.smsGateway')}</h5></div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">{t('admin.page.smsTemplate')}</label>
                <input className="form-control form-control-sm" placeholder="https://gateway.example.com/send?to={phone}&msg={message}" value={config.sms_gateway} onChange={e => setConfig({...config, sms_gateway: e.target.value})} />
                <small className="text-muted">Use {'{phone}'} and {'{message}'} as placeholders</small>
              </div>
              <div className="alert alert-info small mb-0">
                <i className="bi bi-info-circle me-1"></i>
                Common gateways: Twilio API, email-to-SMS (number@carrier.com), or custom HTTP endpoint
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <button className="btn btn-primary" onClick={handleSave}>
          <i className="bi bi-floppy me-1"></i>{saved ? t('admin.page.saved') : t('admin.page.saveSettings')}
        </button>
        <small className="text-muted ms-2">{t('admin.page.settingsNote')}</small>
      </div>
    </div>
  );
}

function ChartTrackingTab() {
  const { t } = useTranslation();
  const [charts, setCharts] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('chart_tracking') || '[]'); } catch { return []; }
  });
  const [form, setForm] = useState({ patientId: '', patientName: '', location: '', checkedOut: false });

  const addChart = () => {
    if (!form.patientId) return;
    const entry = { ...form, date: new Date().toISOString(), id: Date.now() };
    const updated = [...charts, entry];
    setCharts(updated);
    localStorage.setItem('chart_tracking', JSON.stringify(updated));
    setForm({ patientId: '', patientName: '', location: '', checkedOut: false });
  };

  const removeChart = (id: number) => {
    const updated = charts.filter(c => c.id !== id);
    setCharts(updated);
    localStorage.setItem('chart_tracking', JSON.stringify(updated));
  };

  const activeCharts = charts.filter(c => !c.checkedOut);

  return (
    <div>
      <div className="card shadow-sm mb-4">
        <div className="card-header"><h5 className="mb-0">{t('admin.page.chartTitle')}</h5></div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-2"><input className="form-control form-control-sm" placeholder={t('admin.page.patientIdPlaceholder')} value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} /></div>
            <div className="col-md-3"><input className="form-control form-control-sm" placeholder={t('admin.page.patientNamePlaceholder')} value={form.patientName} onChange={e => setForm({...form, patientName: e.target.value})} /></div>
            <div className="col-md-3"><input className="form-control form-control-sm" placeholder={t('admin.page.locationPlaceholder')} value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
            <div className="col-md-2"><button className="btn btn-primary btn-sm w-100" onClick={addChart} disabled={!form.patientId}>{t('admin.page.checkInChart')}</button></div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between"><h5 className="mb-0">Active Charts ({activeCharts.length})</h5></div>
        <div className="card-body p-0">
          <table className="table table-sm table-hover mb-0">
            <thead><tr><th>{t('admin.page.chartCols.patientId')}</th><th>{t('admin.page.chartCols.name')}</th><th>{t('admin.page.chartCols.location')}</th><th>{t('admin.page.chartCols.date')}</th><th></th></tr></thead>
            <tbody>
              {charts.map(c => (
                <tr key={c.id} className={c.checkedOut ? 'text-muted text-decoration-line-through' : ''}>
                  <td>#{c.patientId}</td><td>{c.patientName}</td><td>{c.location || '—'}</td><td>{new Date(c.date).toLocaleDateString()}</td>
                  <td><button className="btn btn-outline-success btn-sm" onClick={() => removeChart(c.id)}>{c.checkedOut ? t('admin.page.returned') : t('admin.page.checkOut')}</button></td>
                </tr>
              ))}
              {charts.length === 0 && <tr><td colSpan={5} className="text-muted text-center py-3">{t('admin.page.noCharts')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface SystemSettings {
  language: 'en' | 'fr';
  dateFormat: 'mm/dd/yyyy' | 'dd/mm/yyyy' | 'yyyy-mm-dd';
  timezone: string;
  timeFormat: '12h' | '24h';
  theme: 'light' | 'dark' | 'system';
  clinicName: string;
  clinicPhone: string;
  clinicEmail: string;
  defaultProvider: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  language: 'en',
  dateFormat: 'mm/dd/yyyy',
  timezone: 'America/New_York',
  timeFormat: '12h',
  theme: 'light',
  clinicName: 'OpenRx Clinic',
  clinicPhone: '',
  clinicEmail: '',
  defaultProvider: '',
};

const SETTINGS_KEY = 'openemr_system_settings';

const timezones = [
  { value: 'America/New_York', label: 'Eastern (UTC-5)' },
  { value: 'America/Chicago', label: 'Central (UTC-6)' },
  { value: 'America/Denver', label: 'Mountain (UTC-7)' },
  { value: 'America/Los_Angeles', label: 'Pacific (UTC-8)' },
  { value: 'America/Anchorage', label: 'Alaska (UTC-9)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (UTC-10)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10)' },
];

function loadSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function SettingsTab() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SystemSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'consultations' | 'language' | 'legacy'>('general');

  const update = (patch: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    localStorage.removeItem(SETTINGS_KEY);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const legacyLinks = [
    { title: t('admin.page.legacy.oauth2'), icon: 'bi-shield-lock', url: '/interface/smart/admin-client.php', desc: t('admin.page.legacy.oauth2Desc') },
    { title: t('admin.page.legacy.practice'), icon: 'bi-gear', url: '/interface/super/edit_globals.php', desc: t('admin.page.legacy.practiceDesc') },
    { title: t('admin.page.legacy.modules'), icon: 'bi-puzzle', url: '/interface/modules/zend_modules/public/index.php', desc: t('admin.page.legacy.modulesDesc') },
    { title: t('admin.page.legacy.database'), icon: 'bi-database', url: '/sql_patch.php', desc: t('admin.page.legacy.databaseDesc') },
  ];

  return (
    <div>
      {/* Section pills */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <ul className="nav nav-pills">
          {[
            { id: 'general' as const, label: t('admin.page.sections.general'), icon: 'bi-gear' },
            { id: 'consultations' as const, label: t('admin.page.sections.consultations'), icon: 'bi-camera-video' },
            { id: 'language' as const, label: t('admin.page.sections.language'), icon: 'bi-translate' },
            { id: 'legacy' as const, label: t('admin.page.sections.legacy'), icon: 'bi-link-45deg' },
          ].map((s) => (
            <li className="nav-item" key={s.id}>
              <button
                className={`nav-link ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <i className={`bi ${s.icon} me-1`}></i>{s.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={handleReset}>
            <i className="bi bi-arrow-counterclockwise me-1"></i>Reset Defaults
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            <i className="bi bi-floppy me-1"></i>{saved ? t('admin.page.saved') : t('admin.page.saveSettings')}
          </button>
        </div>
      </div>

      {saved && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          Settings saved successfully. Changes will take effect on next page refresh.
          <button type="button" className="btn-close" onClick={() => setSaved(false)}></button>
        </div>
      )}

      {/* ===== General Section ===== */}
      {activeSection === 'general' && (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header"><h5 className="mb-0"><i className="bi bi-building me-2"></i>{t('admin.page.clinicInfo')}</h5></div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t('admin.page.clinicName')}</label>
                  <input className="form-control form-control-sm" value={settings.clinicName}
                    onChange={e => update({ clinicName: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t('admin.page.phone')}</label>
                  <PhoneInput value={settings.clinicPhone} onChange={v => update({ clinicPhone: v })} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t('admin.page.email')}</label>
                  <input className="form-control form-control-sm" placeholder={t('admin.page.emailPlaceholder')} value={settings.clinicEmail}
                    onChange={e => update({ clinicEmail: e.target.value })} />
                </div>
                <div className="mb-0">
                  <label className="form-label small fw-semibold">{t('admin.page.defaultProvider')}</label>
                  <input className="form-control form-control-sm" placeholder={t('admin.page.providerPlaceholder')} value={settings.defaultProvider}
                    onChange={e => update({ defaultProvider: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header"><h5 className="mb-0"><i className="bi bi-palette me-2"></i>{t('admin.page.appearance')}</h5></div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t('admin.page.theme')}</label>
                  <div className="d-flex gap-2">
                    {([
                      { value: 'light' as const, icon: 'bi-sun', label: t('admin.page.light') },
                      { value: 'dark' as const, icon: 'bi-moon', label: t('admin.page.dark') },
                      { value: 'system' as const, icon: 'bi-display', label: t('admin.page.system') },
                    ]).map((t) => (
                      <button key={t.value}
                        className={`btn btn-sm flex-fill ${settings.theme === t.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => update({ theme: t.value })}>
                        <i className={`bi ${t.icon} me-1`}></i>{t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t('admin.page.timeFormat')}</label>
                  <div className="d-flex gap-2">
                    <button className={`btn btn-sm flex-fill ${settings.timeFormat === '12h' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => update({ timeFormat: '12h' })}>
                      12-Hour (2:30 PM)
                    </button>
                    <button className={`btn btn-sm flex-fill ${settings.timeFormat === '24h' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => update({ timeFormat: '24h' })}>
                      24-Hour (14:30)
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t('admin.page.dateFormat')}</label>
                  <select className="form-select form-select-sm" value={settings.dateFormat}
                    onChange={e => update({ dateFormat: e.target.value as SystemSettings['dateFormat'] })}>
                    <option value="mm/dd/yyyy">{t('admin.page.dateUs')}</option>
                    <option value="dd/mm/yyyy">{t('admin.page.dateIntl')}</option>
                    <option value="yyyy-mm-dd">{t('admin.page.dateIso')}</option>
                  </select>
                </div>
                <div className="mb-0">
                  <label className="form-label small fw-semibold">{t('admin.page.timezone')}</label>
                  <select className="form-select form-select-sm" value={settings.timezone}
                    onChange={e => update({ timezone: e.target.value })}>
                    {timezones.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Language & Region Section ===== */}
      {activeSection === 'language' && (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow-sm border-primary">
              <div className="card-header bg-primary bg-opacity-10 border-primary">
                <h5 className="mb-0">
                  <i className="bi bi-translate me-2 text-primary"></i>
                  System Language
                </h5>
              </div>
              <div className="card-body">
                <p className="text-muted small mb-3">
                  Select the default language for the OpenRx interface. All menus, labels, and system messages will appear in the selected language.
                </p>

                <div className="row g-3">
                  <div className="col-6">
                    <button
                      className={`btn w-100 h-100 p-4 text-center ${settings.language === 'en' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => update({ language: 'en' })}
                    >
                      <span style={{ fontSize: '3rem' }}>🇺🇸</span>
                      <h5 className="mt-2 mb-1">{t('admin.page.english')}</h5>
                      <span className="opacity-75 small">{t('admin.page.englishDefault')}</span>
                      {settings.language === 'en' && (
                        <div className="mt-2"><span className="badge bg-white text-primary small">{t('admin.page.active')}</span></div>
                      )}
                    </button>
                  </div>
                  <div className="col-6">
                    <button
                      className={`btn w-100 h-100 p-4 text-center ${settings.language === 'fr' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => update({ language: 'fr' })}
                    >
                      <span style={{ fontSize: '3rem' }}>🇫🇷</span>
                      <h5 className="mt-2 mb-1">Français</h5>
                      <span className="opacity-75 small">{t('admin.page.frenchFull')}</span>
                      {settings.language === 'fr' && (
                        <div className="mt-2"><span className="badge bg-white text-primary small">Actif</span></div>
                      )}
                    </button>
                  </div>
                </div>

                <div className="alert alert-info small mt-3 mb-0 d-flex align-items-center">
                  <i className="bi bi-info-circle me-2"></i>
                  Language selection affects the entire application interface. Additional languages may be added by your system administrator via the legacy Language module.
                </div>
              </div>
            </div>

            <div className="card shadow-sm mt-4">
              <div className="card-header">
                <h5 className="mb-0"><i className="bi bi-geo-alt me-2"></i>{t('admin.page.regional')}</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t('admin.page.dateFormat')}</label>
                  <select className="form-select form-select-sm" value={settings.dateFormat}
                    onChange={e => update({ dateFormat: e.target.value as SystemSettings['dateFormat'] })}>
                    <option value="mm/dd/yyyy">{t('admin.page.dateUs')}</option>
                    <option value="dd/mm/yyyy">{t('admin.page.dateIntl')}</option>
                    <option value="yyyy-mm-dd">{t('admin.page.dateIso')}</option>
                  </select>
                  <div className="form-text">Preview: {new Date().toLocaleDateString(
                    settings.language === 'fr' ? 'fr-FR' : 'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                  )}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t('admin.page.timeFormat')}</label>
                  <div className="d-flex gap-2">
                    <button className={`btn btn-sm flex-fill ${settings.timeFormat === '12h' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => update({ timeFormat: '12h' })}>12-Hour</button>
                    <button className={`btn btn-sm flex-fill ${settings.timeFormat === '24h' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => update({ timeFormat: '24h' })}>24-Hour</button>
                  </div>
                </div>
                <div className="mb-0">
                  <label className="form-label small fw-semibold">{t('admin.page.timezone')}</label>
                  <select className="form-select form-select-sm" value={settings.timezone}
                    onChange={e => update({ timezone: e.target.value })}>
                    {timezones.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="mb-0"><i className="bi bi-eye me-2"></i>Preview</h5>
              </div>
              <div className="card-body">
                <div className="border rounded p-4 bg-light">
                  <h6 className="mb-3">
                    {settings.language === 'fr' ? 'Paramètres de Langue' : 'Language Settings'}
                  </h6>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      {settings.language === 'fr' ? 'Langue sélectionnée' : 'Selected Language'}
                    </label>
                    <div className="d-flex align-items-center gap-2 p-2 bg-white rounded border">
                      <span style={{ fontSize: '1.5rem' }}>
                        {settings.language === 'fr' ? '🇫🇷' : '🇺🇸'}
                      </span>
                      <div>
                        <strong>{settings.language === 'fr' ? 'Français' : 'English'}</strong>
                        <br />
                        <small className="text-muted">
                          {settings.language === 'fr' ? 'Interface en français' : 'English interface'}
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">
                        {settings.language === 'fr' ? 'Format de date' : 'Date Format'}
                      </label>
                      <div className="bg-white border rounded p-2 small">
                        {new Date().toLocaleDateString(
                          settings.language === 'fr' ? 'fr-FR' : 'en-US',
                          { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
                        )}
                      </div>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">
                        {settings.language === 'fr' ? 'Heure' : 'Time'}
                      </label>
                      <div className="bg-white border rounded p-2 small">
                        {new Date().toLocaleTimeString(
                          settings.language === 'fr' ? 'fr-FR' : 'en-US',
                          { hour: '2-digit', minute: '2-digit', hour12: settings.timeFormat === '12h' }
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      {settings.language === 'fr' ? 'Exemple de bouton' : 'Sample Button'}
                    </label>
                    <button className="btn btn-primary btn-sm">
                      <i className="bi bi-check-circle me-1"></i>
                      {settings.language === 'fr' ? 'Enregistrer' : 'Save'}
                    </button>
                  </div>

                  <div className="mb-0">
                    <label className="form-label small fw-semibold">
                      {settings.language === 'fr' ? 'Message système' : 'System Message'}
                    </label>
                    <div className="alert alert-success small mb-0">
                      {settings.language === 'fr'
                        ? 'Paramètres enregistrés avec succès.'
                        : 'Settings saved successfully.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Consultations Section (server-backed feature flags) ===== */}
      {activeSection === 'consultations' && <ConsultationsSettings />}

      {/* ===== Legacy Tools Section ===== */}
      {activeSection === 'legacy' && (
        <div>
          <div className="alert alert-info d-flex align-items-center mb-4">
            <i className="bi bi-info-circle-fill me-2"></i>
            These functions open in the legacy PHP interface (not yet migrated to SPA).
          </div>
          <div className="row g-3">
            {legacyLinks.map(link => (
              <div className="col-md-3" key={link.title}>
                <a href={link.url} target="_blank" rel="noreferrer" className="text-decoration-none">
                  <div className="card h-100 shadow-sm legacy-link-card">
                    <div className="card-body text-center p-4">
                      <i className={`bi ${link.icon} text-primary`} style={{ fontSize: '2rem' }}></i>
                      <h6 className="mt-2 mb-1">{link.title}</h6>
                      <p className="text-muted small mb-0">{link.desc}</p>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** A server-backed setting as returned by `GET /admin/settings`. */
interface ServerSettingItem {
  key: string;
  label: string;
  description: string;
  group: string;
  type: 'boolean' | 'string';
  value: boolean | string;
  public?: boolean;
}

/**
 * Server-backed feature flags for patient-facing consultations. Unlike the rest
 * of this tab (which is per-browser localStorage), these are stored on the
 * backend and enforced by the API, so they apply to every patient and device.
 */
function ConsultationsSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: items = [], isLoading } = useQuery<ServerSettingItem[]>({
    queryKey: ['server-settings'],
    queryFn: async () => (await nestClient.get('/admin/settings')).data,
  });

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => nestClient.put('/admin/settings', patch),
    onSuccess: (r: { data: ServerSettingItem[] }) => {
      queryClient.setQueryData(['server-settings'], r.data);
      // The public flag drives the booking page — refresh it immediately.
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const consultations = items.filter((i) => i.group === 'consultations');

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="card shadow-sm">
          <div className="card-header d-flex align-items-center justify-content-between">
            <h5 className="mb-0"><i className="bi bi-camera-video me-2"></i>{t('admin.page.video.title')}</h5>
            <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary">{t('admin.page.video.patientFacing')}</span>
          </div>
          <div className="card-body">
            <p className="text-muted small mb-3">
              Choose which consultation types patients can request from the public booking page.
              Switching one off hides it from patients and rejects it at the API.
            </p>

            {saved && (
              <div className="alert alert-success py-2 small d-flex align-items-center">
                <i className="bi bi-check-circle-fill me-2"></i>Setting saved.
              </div>
            )}
            {save.isError && (
              <div className="alert alert-danger py-2 small d-flex align-items-center">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>Could not save the setting. Please try again.
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
            ) : consultations.length === 0 ? (
              <div className="text-muted small py-3">{t('admin.page.video.none')}</div>
            ) : (
              consultations.map((s) => (
                <div
                  key={s.key}
                  className="d-flex align-items-start justify-content-between gap-3 p-3 rounded-3 border mb-3"
                  style={{ background: s.value === true ? 'rgba(0,201,167,0.07)' : 'rgba(108,117,125,0.07)' }}
                >
                  <div className="d-flex gap-3">
                    <div
                      className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                        s.value === true ? 'vc-gradient text-white' : 'bg-secondary bg-opacity-25 text-secondary'
                      }`}
                      style={{ width: 46, height: 46 }}
                    >
                      <i className="bi bi-camera-video-fill fs-5"></i>
                    </div>
                    <div>
                      <div className="fw-semibold d-flex align-items-center gap-2 flex-wrap">
                        {s.label}
                        <span className={`badge rounded-pill ${s.value === true ? 'bg-success' : 'bg-secondary'}`}>
                          {s.value === true ? t('admin.page.video.on') : t('admin.page.video.off')}
                        </span>
                      </div>
                      <div className="small text-muted mt-1">{s.description}</div>
                    </div>
                  </div>
                  <div className="form-check form-switch fs-5 flex-shrink-0" style={{ paddingLeft: '3rem' }}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      style={{ cursor: 'pointer' }}
                      checked={s.value === true}
                      disabled={save.isPending}
                      onChange={(e) => save.mutate({ [s.key]: e.target.checked })}
                      aria-label={`${s.label} enabled`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="card shadow-sm">
          <div className="card-header"><h5 className="mb-0"><i className="bi bi-info-circle me-2"></i>{t('admin.page.video.howItWorks')}</h5></div>
          <div className="card-body small text-muted">
            <p>
              {t('admin.page.video.howLead')} <strong>{t('admin.page.video.title')}</strong>{' '}
              {t('admin.page.video.howMid')}
              <code className="ms-1">/book-appointment</code> {t('admin.page.video.howTail')}
            </p>
            <p className="mb-0">
              Turned off, the video option and its booking callout disappear, and any video booking
              sent straight to the API is refused — existing video appointments can still be joined
              from the Bookings page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pending Registrations Tab (admin review) ──────────────────
function PendingRegistrationsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['pending-registrations'],
    queryFn: async () => { const r = await nestClient.get('/admin/pending-registrations'); return r.data; },
    refetchInterval: 30000,
  });

  const approve = useMutation({
    mutationFn: (id: number) => nestClient.put(`/admin/users/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-registrations'] }),
  });

  const reject = useMutation({
    mutationFn: (id: number) => nestClient.put(`/admin/users/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-registrations'] }),
  });

  if (isLoading) return <div className="text-center py-4"><div className="spinner-border text-primary" /></div>;

  return (
    <div>
      <div className="alert alert-warning small d-flex align-items-center gap-2 mb-3">
        <i className="bi bi-info-circle fs-5"></i>
        <div>
          <strong>30-Day Review Window:</strong> Pending registrations must be approved or rejected within 30 days.
          After 30 days, un-reviewed applications will be auto-rejected.
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-check-circle" style={{ fontSize: '3rem' }}></i>
          <h5 className="mt-2">{t('admin.page.pending.emptyTitle')}</h5>
          <p className="small">{t('admin.page.pending.emptyHint')}</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>{t('admin.page.pending.cols.id')}</th><th>{t('admin.page.pending.cols.name')}</th><th>{t('admin.page.pending.cols.username')}</th><th>{t('admin.page.pending.cols.title')}</th>
                <th>{t('admin.page.pending.cols.specialty')}</th><th>{t('admin.page.pending.cols.email')}</th><th>{t('admin.page.pending.cols.registered')}</th>
                <th>{t('admin.page.pending.cols.daysLeft')}</th><th>{t('admin.page.pending.cols.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((u: any) => {
                const daysLeft = u.days_until_auto_reject ?? 30;
                const urgent = daysLeft <= 5;
                return (
                  <tr key={u.id} className={urgent ? 'table-warning' : ''}>
                    <td><code>{u.id}</code></td>
                    <td><strong>{u.fname} {u.lname}</strong></td>
                    <td>{u.username}</td>
                    <td>{u.title || '—'}</td>
                    <td>{u.specialty || '—'}</td>
                    <td><small>{u.email || '—'}</small></td>
                    <td><small>{new Date(u.date_created).toLocaleDateString()}</small></td>
                    <td>
                      <span className={`badge ${urgent ? 'bg-danger' : daysLeft <= 14 ? 'bg-warning text-dark' : 'bg-success'}`}>
                        {t('admin.page.pending.days', { count: daysLeft })}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-success btn-sm"
                          onClick={() => approve.mutate(u.id)}
                          disabled={approve.isPending}>
                          <i className="bi bi-check-lg me-1"></i>Approve
                        </button>
                        <button className="btn btn-outline-danger btn-sm"
                          onClick={() => reject.mutate(u.id)}
                          disabled={reject.isPending}>
                          <i className="bi bi-x-lg me-1"></i>Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Menu access control ──────────────────────────────────────────────────

function MenuAccessTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'menu-permissions'],
    queryFn: async () => (await nestClient.get('/admin/menu-permissions')).data,
  });
  const setMut = useMutation({
    mutationFn: (d: any) => nestClient.put('/admin/menu-permissions', d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'menu-permissions'] }),
  });

  if (isLoading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  const { roles = [], menuItems = [], permissions = {} } = data || {};

  return (
    <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', position: 'relative', zIndex: 1 }}>
      <div className="card-header bg-white py-3" style={{ borderRadius: '16px 16px 0 0' }}>
        <h6 className="mb-1 fw-bold"><i className="bi bi-menu-button-wide me-2 text-primary"></i>{t('admin.page.menuAccess.title')}</h6>
        <small className="text-muted">{t('admin.page.menuAccess.hint')}</small>
      </div>
      <div className="card-body p-0" style={{ overflowX: 'auto' }}>
        <table className="table table-sm align-middle mb-0" style={{ minWidth: '960px' }}>
          <thead className="table-light">
            <tr>
              <th style={{ position: 'sticky', left: 0, background: '#f8f9fa', minWidth: '230px', zIndex: 1 }}>{t('admin.page.menuAccess.menuItem')}</th>
              {roles.map((r: string) => (
                <th key={r} className="text-center text-capitalize" style={{ fontSize: '0.7rem' }}>{r.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {menuItems.map((m: any) => (
              <tr key={m.key}>
                <td style={{ position: 'sticky', left: 0, background: '#fff', whiteSpace: 'nowrap' }}>
                  <span className="badge bg-light text-dark border me-1" style={{ fontSize: '0.6rem' }}>{m.section}</span>
                  <span className="small">{m.label}</span>
                </td>
                {roles.map((role: string) => {
                  const enabled = permissions[role]?.[m.key] !== false;
                  return (
                    <td key={role} className="text-center">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={enabled}
                        onChange={(e) => setMut.mutate({ role, menuKey: m.key, enabled: e.target.checked })}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
