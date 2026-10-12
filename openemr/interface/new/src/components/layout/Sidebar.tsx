 import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import nestClient from '../../api/nest-client';
import { useNotificationSummary } from '../../hooks/useNotifications';
import { useMyAvatar } from '../../hooks/useMyAvatar';

/** The numeric counters from /notifications/summary that can carry a badge. */
type BadgeKey = 'messages' | 'referrals' | 'drugInfo' | 'pharmacy' | 'patientFlow';

interface SubItem {
  to: string;
  /** i18n key under `shell.items.*` (stable; also used as a React key). */
  labelKey: string;
  icon: string;
  roles: string[];
  mainMenuRoles?: string[];
  /** Which badge count from /notifications/summary to show next to the item. */
  badgeKey?: BadgeKey;
}

interface MenuSection {
  /** Stable id (used for state/collapse keys) — translated via `shell.sections.*`. */
  key: string;
  icon: string;
  roles: string[];
  children: SubItem[];
}

const menuSections: MenuSection[] = [
  {
    key: 'dashboard', icon: 'bi-speedometer2',
    roles: ['admin', 'physician', 'nurse', 'midwife', 'lab_tech', 'front_desk', 'billing'],
    children: [
      { to: '/provider-dashboard', labelKey: 'myDashboard', icon: 'bi-person-badge', roles: ['admin', 'physician'] },
      { to: '/registrar-dashboard', labelKey: 'myDashboard', icon: 'bi-person-badge', roles: ['front_desk'] },
      { to: '/nurse-dashboard', labelKey: 'nurseAideDashboard', icon: 'bi-person-badge', roles: ['nurse'], mainMenuRoles: ['nurse'] },
      { to: '/rn-dashboard', labelKey: 'rnDashboard', icon: 'bi-person-badge', roles: ['nurse'], mainMenuRoles: ['registered_nurse'] },
      { to: '/midwife-dashboard', labelKey: 'myDashboard', icon: 'bi-person-badge', roles: ['midwife'] },
      { to: '/lab-tech-dashboard', labelKey: 'myDashboard', icon: 'bi-person-badge', roles: ['lab_tech'] },
      { to: '/dashboard', labelKey: 'clinicOverview', icon: 'bi-grid', roles: ['admin'] },
    ],
  },
  {
    key: 'patients', icon: 'bi-people',
    roles: ['admin', 'physician', 'midwife', 'nurse', 'billing', 'front_desk'],
    children: [
      { to: '/patients', labelKey: 'searchRegister', icon: 'bi-search', roles: ['admin', 'front_desk', 'midwife'] },
      { to: '/providers', labelKey: 'providers', icon: 'bi-person-badge', roles: ['admin', 'front_desk'] },
    ],
  },
  {
    key: 'maternity', icon: 'bi-heart-fill',
    roles: ['midwife', 'admin', 'physician'],
    children: [
      { to: '/midwife-dashboard', labelKey: 'maternalDashboard', icon: 'bi-speedometer2', roles: ['midwife'] },
      { to: '/patients', labelKey: 'maternalPatients', icon: 'bi-people-fill', roles: ['midwife', 'physician'] },
      { to: '/appointments', labelKey: 'deliverySchedule', icon: 'bi-calendar-heart', roles: ['midwife', 'admin'] },
    ],
  },
  {
    key: 'laboratory', icon: 'bi-flask',
    roles: ['lab_tech', 'admin', 'physician', 'nurse'],
    children: [
      { to: '/lab-tech-dashboard', labelKey: 'labDashboard', icon: 'bi-speedometer2', roles: ['lab_tech'] },
      { to: '/lab-dashboard', labelKey: 'labManagement', icon: 'bi-clipboard-pulse', roles: ['lab_tech', 'admin', 'physician'] },
      { to: '/labs', labelKey: 'labOrders', icon: 'bi-clipboard-check', roles: ['lab_tech', 'physician', 'nurse'] },
      { to: '/lab-results', labelKey: 'labResultForms', icon: 'bi-clipboard2-pulse', roles: ['lab_tech', 'admin', 'physician'] },
    ],
  },
  {
    key: 'inventory', icon: 'bi-boxes',
    roles: ['admin', 'inventory_manager', 'physician', 'nurse', 'lab_tech', 'front_desk'],
    children: [
      { to: '/inventory', labelKey: 'inventory', icon: 'bi-box-seam', roles: ['admin', 'inventory_manager', 'physician', 'nurse', 'lab_tech', 'front_desk'] },
    ],
  },
  {
    key: 'pharmacy', icon: 'bi-capsule',
    roles: ['pharmacist', 'admin'],
    children: [
      { to: '/pharmacy', labelKey: 'pharmacyPrescriptions', icon: 'bi-capsule-pill', roles: ['pharmacist', 'admin'], badgeKey: 'pharmacy' },
    ],
  },
  {
    key: 'appointments', icon: 'bi-calendar-event',
    roles: ['admin', 'physician', 'front_desk'],
    children: [
      { to: '/appointments', labelKey: 'calendar', icon: 'bi-calendar3', roles: ['admin', 'physician', 'front_desk'] },
      { to: '/bookings', labelKey: 'bookingsQr', icon: 'bi-qr-code', roles: ['admin', 'front_desk'] },
      { to: '/appointments/flow', labelKey: 'patientFlow', icon: 'bi-kanban', roles: ['admin', 'physician', 'front_desk'], badgeKey: 'patientFlow' },
      { to: '/appointments/recall', labelKey: 'recallBoard', icon: 'bi-bell', roles: ['admin', 'physician'] },
      { to: '/appointments/screening', labelKey: 'drugScreening', icon: 'bi-shuffle', roles: ['admin', 'physician'] },
      { to: '/inpatient', labelKey: 'inpatientAdt', icon: 'bi-hospital', roles: ['admin', 'physician', 'nurse', 'front_desk'] },
    ],
  },
  {
    key: 'emergency', icon: 'bi-heart-pulse-fill',
    roles: ['admin', 'physician', 'nurse', 'midwife', 'front_desk'],
    children: [
      { to: '/emergency', labelKey: 'triageBoard', icon: 'bi-clipboard2-pulse', roles: ['admin', 'physician', 'nurse', 'midwife', 'front_desk'] },
    ],
  },
  {
    key: 'clinical', icon: 'bi-heart-pulse',
    roles: ['admin', 'physician'],
    children: [
      { to: '/referrals', labelKey: 'referrals', icon: 'bi-send', roles: ['admin', 'physician', 'front_desk'], badgeKey: 'referrals' },
      { to: '/cds', labelKey: 'decisionSupport', icon: 'bi-cpu', roles: ['admin', 'physician'] },
      { to: '/group-therapy', labelKey: 'groupTherapy', icon: 'bi-people-fill', roles: ['admin', 'physician'] },
      { to: '/fda', labelKey: 'fdaLookup', icon: 'bi-shield-check', roles: ['admin', 'physician', 'nurse'] },
      { to: '/drug-info', labelKey: 'drugInfo', icon: 'bi-capsule', roles: ['admin', 'physician', 'nurse'], badgeKey: 'drugInfo' },
      { to: '/templates', labelKey: 'templates', icon: 'bi-file-earmark-text', roles: ['admin', 'physician'] },
      { to: '/pharmacy', labelKey: 'pharmacy', icon: 'bi-capsule-pill', roles: ['admin', 'physician', 'nurse'], badgeKey: 'pharmacy' },
    ],
  },
  {
    key: 'messaging', icon: 'bi-chat-dots',
    roles: ['admin', 'physician', 'front_desk', 'billing', 'midwife', 'lab_tech', 'nurse'],
    children: [
      { to: '/messages', labelKey: 'inbox', icon: 'bi-inbox', roles: ['admin', 'physician', 'nurse', 'midwife', 'lab_tech', 'front_desk', 'billing'], badgeKey: 'messages' },
      { to: '/messages/patient-chat', labelKey: 'patientChat', icon: 'bi-chat-heart', roles: ['admin', 'physician', 'nurse', 'midwife', 'front_desk', 'lab_tech', 'pharmacist', 'billing'] },
      { to: '/direct-messaging', labelKey: 'directMsg', icon: 'bi-envelope-arrow-up', roles: ['admin', 'physician'] },
    ],
  },
  {
    key: 'billing', icon: 'bi-currency-dollar',
    roles: ['admin', 'billing'],
    children: [
      { to: '/billing', labelKey: 'billingDashboard', icon: 'bi-cash-stack', roles: ['admin', 'billing'] },
      { to: '/billing/medical', labelKey: 'medicalBilling', icon: 'bi-file-earmark-medical', roles: ['admin', 'billing'] },
    ],
  },
  {
    key: 'documents', icon: 'bi-folder',
    roles: ['admin', 'physician', 'front_desk'],
    children: [
      { to: '/documents', labelKey: 'secureDocuments', icon: 'bi-shield-lock', roles: ['admin', 'physician', 'nurse', 'front_desk'] },
      { to: '/dicom', labelKey: 'dicom', icon: 'bi-image', roles: ['admin', 'physician'] },
    ],
  },
  {
    key: 'reports', icon: 'bi-graph-up',
    roles: ['admin', 'physician'],
    children: [
      { to: '/reports', labelKey: 'reports', icon: 'bi-bar-chart', roles: ['admin', 'physician'] },
      { to: '/reports/surveillance', labelKey: 'surveillance', icon: 'bi-broadcast', roles: ['admin'] },
    ],
  },
  {
    key: 'admin', icon: 'bi-gear-wide-connected',
    roles: ['admin'],
    children: [
      { to: '/admin', labelKey: 'systemAdmin', icon: 'bi-sliders', roles: ['admin'] },
      { to: '/db-admin', labelKey: 'databaseAdmin', icon: 'bi-database', roles: ['admin'] },
      { to: '/disclosures', labelKey: 'disclosures', icon: 'bi-shield-lock', roles: ['admin'] },
      { to: '/license', labelKey: 'license', icon: 'bi-key', roles: ['admin'] },
    ],
  },
  {
    key: 'patientPortal', icon: 'bi-person-heart',
    roles: ['admin', 'front_desk', 'billing'],
    children: [
      { to: '/portal/login', labelKey: 'portalLogin', icon: 'bi-box-arrow-in-right', roles: ['admin', 'front_desk', 'billing'] },
      { to: '/portal/dashboard', labelKey: 'portalDashboard', icon: 'bi-speedometer2', roles: ['admin', 'front_desk', 'billing'] },
      { to: '/portal/register', labelKey: 'registerPatient', icon: 'bi-person-plus', roles: ['admin', 'front_desk'] },
    ],
  },
  {
    key: 'help', icon: 'bi-question-circle',
    roles: ['admin', 'physician', 'front_desk', 'billing', 'midwife', 'lab_tech', 'nurse'],
    children: [
      { to: '/how-to', labelKey: 'howToGuide', icon: 'bi-journal-text', roles: ['admin', 'physician', 'nurse', 'midwife', 'lab_tech', 'front_desk', 'billing'] },
      { to: '/wiki', labelKey: 'wiki', icon: 'bi-book', roles: ['admin', 'physician', 'nurse', 'midwife', 'lab_tech', 'front_desk', 'billing'] },
      { to: '/community', labelKey: 'communityForum', icon: 'bi-people-fill', roles: ['admin', 'physician', 'nurse', 'midwife', 'lab_tech', 'front_desk', 'billing'] },
      { to: '/help', labelKey: 'faqHelp', icon: 'bi-question-circle', roles: ['admin', 'physician', 'nurse', 'midwife', 'lab_tech', 'front_desk', 'billing'] },
    ],
  },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dashboard: true,
  });
  // Easter egg: "Database Admin" is hidden until the admin avatar is clicked 5 times.
  const [adminAvatarClicks, setAdminAvatarClicks] = useState(0);
  const dbAdminUnlocked = adminAvatarClicks >= 5;
  const dbAdminClicksRemaining = Math.max(0, 5 - adminAvatarClicks);

  const handleAdminAvatarClick = () => {
    setAdminAvatarClicks((c) => (c >= 5 ? 5 : c + 1));
  };

  // The signed-in user's own photo (shared query key with the top bar).
  const { data: myAvatar } = useMyAvatar();
  const myAvatarUrl: string | undefined = myAvatar?.url || undefined;
  const myUserId: number | undefined = myAvatar?.userId;

  // Role-based menu access: admin can toggle menu items per role.
  const { data: menuPermissions } = useQuery({
    queryKey: ['menu-permissions', user?.role],
    queryFn: async () => {
      if (!user?.role) return {} as Record<string, boolean>;
      const r = await nestClient.get(`/menu-permissions/${user.role}`);
      return r.data as Record<string, boolean>;
    },
    enabled: !!user?.role,
  });

  // Live badge counts: messages, referrals, drug info, pharmacy, patient flow.
  const notificationCounts = useNotificationSummary();
  const badgeFor = (item: SubItem): number =>
    item.badgeKey ? notificationCounts[item.badgeKey] || 0 : 0;
  const badgeTone = (key?: BadgeKey) =>
    key === 'referrals' || key === 'drugInfo' ? 'bg-danger' : 'bg-primary';

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter sections by role — only show when user is loaded
  const visibleSections = menuSections.filter(
    (section) => !section.roles.length || (user ? section.roles.includes(user.role || '') : false),
  );

  return (
    <nav
      className="d-flex flex-column glass-sidebar"
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100vh',
        background: 'linear-gradient(180deg, #eaf3ff 0%, #ffffff 55%, #dcf8ef 100%)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderRight: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '6px 0 30px rgba(10,37,64,0.10)',
      }}
    >
      <style>{`
        .glass-sidebar .side-section { border-bottom: 1px solid rgba(13,110,253,0.12); }
        .glass-sidebar .side-header {
          color: #1e3a5f; border: 0; background: transparent;
          transition: background .2s ease, transform .2s ease, box-shadow .2s ease;
          border-radius: 10px;
        }
        .glass-sidebar .side-header:hover {
          background: rgba(255,255,255,0.75);
          transform: translateX(2px);
          box-shadow: 0 6px 14px rgba(10,37,64,0.10);
        }
        .glass-sidebar .side-link {
          color: #33475b; border-radius: 10px;
          transition: background .2s ease, color .2s ease, transform .2s ease, box-shadow .2s ease;
        }
        .glass-sidebar .side-link:hover {
          background: rgba(255,255,255,0.85); color: #0d6efd;
          transform: translateX(3px);
          box-shadow: 0 6px 14px rgba(10,37,64,0.12);
        }
        .glass-sidebar .side-link.active {
          background: linear-gradient(90deg, rgba(13,110,253,0.14), rgba(0,201,167,0.16));
          color: #0d6efd; font-weight: 600;
          box-shadow: inset 0 0 0 1px rgba(13,110,253,0.22);
        }
      `}</style>

      {/* Logo / Brand */}
      <div className="p-3 border-bottom" style={{ borderBottom: '1px solid rgba(13,110,253,0.12)' }}>
        <h6 className="mb-0 fw-bold" style={{ color: '#0d6efd' }}>
          <i className="bi bi-heart-pulse-fill me-2" style={{ color: '#00c9a7' }}></i>
          {t('login.brand')}
        </h6>
      </div>

      {/* Menu Sections — scrollable */}
      <div className="flex-grow-1 overflow-auto" style={{ fontSize: '0.82rem', padding: '0.5rem' }}>
        {visibleSections.map((section) => {
          // Filter sub-items by role
          const visibleChildren = section.children.filter(
            (child) =>
              (!child.roles.length || !user || child.roles.includes(user.role || 'admin')) &&
              (!child.mainMenuRoles?.length || !user || child.mainMenuRoles.includes(user.main_menu_role || '')) &&
              (menuPermissions?.[child.to] !== false) &&
              (child.to !== '/db-admin' || dbAdminUnlocked),
          );
          if (visibleChildren.length === 0) return null;
          const sectionBadge = visibleChildren.reduce((n, c) => n + badgeFor(c), 0);

          const sectionId = section.key;
          const isOpen = openSections[section.key] ?? false;

          return (
            <div key={section.key} className="side-section">
              {/* Section header — clickable toggle */}
              <button
                className="btn btn-link side-header text-decoration-none d-flex align-items-center w-100 py-2 px-2"
                style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                onClick={() => toggleSection(section.key)}
                data-bs-toggle="collapse"
                data-bs-target={`#menu-${sectionId}`}
                aria-expanded={isOpen}
              >
                <i className={`bi ${section.icon} me-2`} style={{ fontSize: '0.85rem', color: '#0d6efd' }}></i>
                <span className="flex-grow-1 text-start">{t(`shell.sections.${section.key}`)}</span>
                {sectionBadge > 0 && (
                  <span className="badge rounded-pill bg-danger me-2" style={{ fontSize: '0.6rem' }}>
                    {sectionBadge > 99 ? '99+' : sectionBadge}
                  </span>
                )}
                <i className={`bi bi-chevron-${isOpen ? 'down' : 'right'} small`}></i>
              </button>

              {/* Collapsible sub-items */}
              <div className={`collapse ${isOpen ? 'show' : ''}`} id={`menu-${sectionId}`}>
                <ul className="nav flex-column pb-1" style={{ paddingLeft: '0.5rem' }}>
                  {visibleChildren.map((item) => (
                    <li className="nav-item" key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `nav-link side-link py-1 px-2 d-flex align-items-center ${isActive ? 'active' : ''}`
                        }
                        style={{ fontSize: '0.78rem' }}
                      >
                        <i className={`bi ${item.icon} me-2`} style={{ fontSize: '0.75rem', width: '16px', textAlign: 'center' }}></i>
                        <span className="text-truncate">{t(`shell.items.${item.labelKey}`)}</span>
                        {badgeFor(item) > 0 && (
                          <span
                            className={`badge rounded-pill ms-auto ${badgeTone(item.badgeKey)}`}
                            style={{ fontSize: '0.6rem' }}
                          >
                            {badgeFor(item) > 99 ? '99+' : badgeFor(item)}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* User info at bottom — the avatar is the easter-egg trigger for hidden Database Admin */}
      {user && (
        <div
          className="p-2 small"
          style={{ borderTop: '1px solid rgba(13,110,253,0.12)', color: '#33475b' }}
        >
          <div
            className="d-flex align-items-center gap-2"
            onClick={handleAdminAvatarClick}
            title={t('shell.clickAvatar')}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            {myAvatarUrl ? (
              <img
                src={myAvatarUrl}
                alt=""
                className="rounded-circle flex-shrink-0"
                style={{ width: '1.6rem', height: '1.6rem', objectFit: 'cover' }}
              />
            ) : (
              <i className="bi bi-person-circle" style={{ fontSize: '1.4rem' }}></i>
            )}
            <span className="text-truncate">{user.displayName}</span>
            {user.role && (
              <span className="badge ms-auto" style={{ fontSize: '0.65rem', background: 'linear-gradient(90deg, #0d6efd, #00c9a7)', color: '#fff' }}>
                {user.role}
              </span>
            )}
          </div>
          {/* Your own photo is changed on your profile page, which is reached by
              user id — the sidebar is the only place that knows it. Only the
              roles the profile endpoint accepts are offered the link. */}
          {myUserId && user.role && ['admin', 'physician', 'front_desk'].includes(user.role) ? (
            <NavLink
              to={`/providers/${myUserId}`}
              className="d-flex align-items-center gap-1 mt-1 text-decoration-none"
              style={{ fontSize: '0.7rem', color: '#0d6efd' }}
            >
              <i className="bi bi-person-badge"></i>
              {myAvatarUrl ? t('shell.myProfilePhoto') : t('shell.addYourPhoto')}
            </NavLink>
          ) : null}
          {adminAvatarClicks >= 3 && !dbAdminUnlocked && (
            <div className="text-center mt-2" style={{ fontSize: '0.7rem', color: '#0d6efd' }}>
              <i className="bi bi-unlock me-1"></i>
              {t('shell.dbAdminMore', { count: dbAdminClicksRemaining })}
            </div>
          )}
          {dbAdminUnlocked && (
            <div className="text-center mt-2" style={{ fontSize: '0.7rem', color: '#00a98f' }}>
              <i className="bi bi-unlock-fill me-1"></i>
              {t('shell.dbAdminUnlocked')}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
