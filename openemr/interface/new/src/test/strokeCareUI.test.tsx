import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({
  overview: vi.fn(),
  protocols: vi.fn(),
  quality: vi.fn(),
  modules: vi.fn(),
  settings: vi.fn(),
  users: vi.fn(),
  trend: vi.fn(),
  sign: vi.fn(),
  reconciliation: vi.fn(),
  saveReconciliation: vi.fn(),
}));
const auth = vi.hoisted(() => ({ role: 'physician' }));
const strings = vi.hoisted<Record<string, string>>(() => ({
  title: 'OpenRx Stroke Care',
  subtitle: 'Outpatient and acute stroke care',
  facility: 'Facility id',
  'tabs.board': 'Stroke board',
  'tabs.emergency': 'Emergency board',
  'tabs.activate': 'New activation',
  'tabs.quality': 'Quality',
  'tabs.protocols': 'Protocols',
  'tabs.configuration': 'Facility configuration',
  'configuration.heading': 'Facility stroke configuration',
  'configuration.description': 'Configuration only.',
  'configuration.facilityRequired': 'Enter a facility id.',
  'configuration.careSetting': 'Care setting',
  'configuration.outpatient': 'Outpatient',
  'configuration.acute': 'Acute',
  'configuration.comprehensive': 'Comprehensive',
  'configuration.save': 'Save configuration',
  'configuration.saved': 'Configuration saved.',
  'configuration.users': 'Facility user assignments',
  'configuration.userId': 'User id',
  'configuration.assign': 'Assign',
  'configuration.remove': 'Remove',
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'clinician', displayName: 'Clinician', role: auth.role },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => strings[key] ?? key }),
}));

vi.mock('../api/endpoints/strokeCare', async () => {
  const actual = await vi.importActual<
    typeof import('../api/endpoints/strokeCare')
  >('../api/endpoints/strokeCare');
  return {
    ...actual,
    getStrokeOverview: api.overview,
    getStrokeProtocols: api.protocols,
    getStrokeQuality: api.quality,
    getFacilityStrokeModules: api.modules,
    getFacilityStrokeSettings: api.settings,
    listFacilityStrokeUsers: api.users,
    getNihssTrend: api.trend,
    signStrokeAssessment: api.sign,
    getStrokeMedicationReconciliation: api.reconciliation,
    saveStrokeMedicationReconciliation: api.saveReconciliation,
  };
});

import StrokeCarePage from '../features/stroke-care/StrokeCarePage';
import FacilityConfigPanel from '../features/stroke-care/components/FacilityConfigPanel';
import NihssForm from '../features/stroke-care/components/NihssForm';
import NihssTrendPanel from '../features/stroke-care/components/NihssTrendPanel';
import MedicationReconciliationPanel from '../features/stroke-care/components/MedicationReconciliationPanel';
import type {
  NihssItemDef,
  ProtocolCatalogue,
  StrokeClinicVisit,
  StrokeOverview,
} from '../api/endpoints/strokeCare';

const PROTOCOLS = {
  nihss: {
    protocol: {
      key: 'openrx.nihss',
      version: '1.0.0',
      effectiveDate: '2026-01-01',
      label: 'OpenRx NIHSS',
      source: 'NIH',
      advisoryOnly: true,
    },
    items: [],
    loinc: { panel: {}, total: {}, items: {} },
    untestableKeys: [],
  },
  acute: {
    protocol: {
      key: 'openrx.acute',
      version: '1.0.0',
      effectiveDate: '2026-01-01',
      label: 'Acute stroke',
      source: 'AHA/ASA',
      advisoryOnly: true,
    },
    timingTargets: {
      doorToImagingMinutes: 25,
      doorToNeedleMinutes: 60,
      thrombolysisWindowMinutes: 270,
      thrombectomyWindowMinutes: 1440,
    },
    orderSets: [],
  },
  followUp: {
    protocol: {
      key: 'openrx.followup',
      version: '1.0.0',
      effectiveDate: '2026-01-01',
      label: 'Follow-up',
      source: 'OpenRx',
      advisoryOnly: true,
    },
  },
  modules: [],
} as unknown as ProtocolCatalogue;

const OVERVIEW = {
  facilityId: 1,
  summary: {
    total: 1,
    active: 1,
    completed: 0,
    acute: 1,
    outpatient: 0,
    comprehensive: 0,
    thrombolysisGiven: 0,
    thrombectomyGiven: 0,
  },
  active: [],
  recent: [
    {
      id: 5,
      pid: 17,
      facility_id: 1,
      activation_code: 'SC-1',
      care_setting: 'acute',
      status: 'active',
      stroke_type: 'ischemic',
      laterality: null,
      nihss_total: 5,
      nihss_severity: 'moderate',
      fname: 'Test',
      lname: 'Patient',
      arrival_at: '2026-05-01T10:00:00',
      lkw_at: null,
      minutes_since_arrival: 30,
      door_to_ct_minutes: 20,
    },
  ],
} as unknown as StrokeOverview;

const DEFS: NihssItemDef[] = [
  {
    key: '1a',
    label: '1a. Level of consciousness',
    max: 3,
    guidance: '',
    options: [
      { value: 0, label: '0' },
      { value: 1, label: '1' },
      { value: 2, label: '2' },
      { value: 3, label: '3' },
    ],
  },
  {
    key: '5a',
    label: '5a. Motor — left arm',
    max: 4,
    guidance: '',
    options: [
      { value: 0, label: '0' },
      { value: 4, label: '4' },
    ],
  },
  {
    key: '11',
    label: '11. Extinction and inattention',
    max: 2,
    guidance: '',
    options: [
      { value: 0, label: '0' },
      { value: 2, label: '2' },
    ],
  },
];

function renderWithProviders(node: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>{node}</QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.role = 'physician';
  api.overview.mockResolvedValue(OVERVIEW);
  api.protocols.mockResolvedValue(PROTOCOLS);
  api.quality.mockResolvedValue({});
  api.trend.mockResolvedValue([]);
  api.modules.mockResolvedValue({
    facilityId: 1,
    setting: 'comprehensive',
    modules: [
      {
        key: 'activation',
        label: 'Stroke activation',
        description: 'Code stroke.',
        settings: ['acute'],
        enabled: true,
      },
      {
        key: 'imaging',
        label: 'Stroke imaging link',
        description: 'Link DICOM.',
        settings: ['acute'],
        enabled: false,
      },
    ],
  });
  api.settings.mockResolvedValue({
    facilityId: 1,
    alertEscalationMinutes: 5,
    transferAcceptanceMinutes: 30,
    updatedBy: null,
    updatedAt: null,
    defaults: 'defaults',
  });
  api.users.mockResolvedValue([]);
  api.reconciliation.mockResolvedValue({
    visitId: 21,
    pid: 17,
    status: 'not_reviewed',
    reconciledAt: null,
    reconciledBy: null,
    medications: [
      {
        prescriptionId: 101,
        drug: 'Aspirin',
        dosage: '81 mg',
        route: 'PO',
        refills: 3,
        startDate: '2026-01-01',
        endDate: null,
        active: true,
        note: null,
        status: 'not_reviewed',
        reconciliationNotes: null,
      },
    ],
  });
  api.saveReconciliation.mockResolvedValue({});
});

afterEach(() => cleanup());

describe('stroke care dashboard', () => {
  it('renders the board with an identifiable patient and encounter', async () => {
    renderWithProviders(<StrokeCarePage />);
    expect(await screen.findByText('OpenRx Stroke Care')).toBeInTheDocument();
    expect(await screen.findByText('Test Patient')).toBeInTheDocument();
    expect(screen.getByText('SC-1')).toBeInTheDocument();
    expect(screen.getByText('Stroke board')).toBeInTheDocument();
  });

  it('shows facility configuration only to administrators', async () => {
    renderWithProviders(<StrokeCarePage />);
    await screen.findByText('Test Patient');
    expect(
      screen.queryByText('Facility configuration'),
    ).not.toBeInTheDocument();
    cleanup();
    auth.role = 'admin';
    renderWithProviders(<StrokeCarePage />);
    expect(
      await screen.findByText('Facility configuration'),
    ).toBeInTheDocument();
  });
});

describe('facility module visibility', () => {
  it('shows configured modules and their enabled state', async () => {
    renderWithProviders(<FacilityConfigPanel facilityId={1} isAdmin />);
    expect(
      await screen.findByText('Facility stroke configuration'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Stroke activation')).toBeInTheDocument();
    expect(screen.getByText('Stroke imaging link')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /Stroke activation/i }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /Stroke imaging link/i }),
    ).not.toBeChecked();
  });

  it('does not expose configuration controls to non-administrators', () => {
    renderWithProviders(
      <FacilityConfigPanel facilityId={1} isAdmin={false} />,
    );
    expect(
      screen.getByText(/Administrator access is required/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('NIHSS assessment entry', () => {
  it('calculates the visible total from all selected items', () => {
    renderWithProviders(
      <NihssForm
        activationId={5}
        definitions={DEFS}
        untestableKeys={['5a']}
        canDocument
        onSaved={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('1a. Level of consciousness'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('5a. Motor — left arm'), {
      target: { value: '4' },
    });
    fireEvent.change(
      screen.getByLabelText('11. Extinction and inattention'),
      { target: { value: '0' } },
    );
    expect(screen.getByText('Total: 5 / 9')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('surfaces validation errors instead of silently finalizing incomplete work', () => {
    renderWithProviders(
      <NihssForm
        activationId={5}
        definitions={DEFS}
        untestableKeys={['5a']}
        canDocument
        onSaved={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Finalize' }));
    expect(screen.getByText('3 item(s) not assessed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Complete every item or document it as untestable before signing.',
      ),
    ).toBeInTheDocument();
    expect(api.sign).not.toHaveBeenCalled();
  });

  it('requires a reason before an untestable item is accepted', () => {
    renderWithProviders(
      <NihssForm
        activationId={5}
        definitions={DEFS}
        untestableKeys={['5a']}
        canDocument
        onSaved={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('1a. Level of consciousness'), {
      target: { value: '1' },
    });
    fireEvent.change(
      screen.getByLabelText('11. Extinction and inattention'),
      { target: { value: '0' } },
    );
    fireEvent.click(screen.getByLabelText('Untestable'));
    expect(screen.getByText(/Reason required: 5a/)).toBeInTheDocument();
  });
});

describe('outpatient medication reconciliation', () => {
  const visits = [
    {
      id: 21,
      visit_at: '2026-05-01T10:00:00',
      neurologist_name: 'Dr Test',
    } as unknown as StrokeClinicVisit,
  ];

  it('renders active prescriptions and requires a status for each', async () => {
    renderWithProviders(
      <MedicationReconciliationPanel
        visits={visits}
        canDocument
        onSaved={vi.fn()}
      />,
    );
    expect(await screen.findByText('Aspirin')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign reconciliation' }),
    ).toBeDisabled();
    fireEvent.change(
      screen.getByLabelText('Reconciliation status for Aspirin'),
      { target: { value: 'continued' } },
    );
    expect(
      screen.getByRole('button', { name: 'Sign reconciliation' }),
    ).toBeEnabled();
  });

  it('signs the reconciled medication snapshot', async () => {
    renderWithProviders(
      <MedicationReconciliationPanel
        visits={visits}
        canDocument
        onSaved={vi.fn()}
      />,
    );
    await screen.findByText('Aspirin');
    fireEvent.change(
      screen.getByLabelText('Reconciliation status for Aspirin'),
      { target: { value: 'continued' } },
    );
    fireEvent.change(screen.getByLabelText('Signed by'), {
      target: { value: 'Dr Test' },
    });
    fireEvent.click(
      screen.getByLabelText('I reviewed every active medication.'),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Sign reconciliation' }),
    );
    await waitFor(() =>
      expect(api.saveReconciliation).toHaveBeenCalledWith(21, {
        items: [{ prescriptionId: 101, status: 'continued' }],
        signedByName: 'Dr Test',
        signatureConfirmed: true,
      }),
    );
  });
});

describe('NIHSS score history and patient context', () => {
  it('displays finalized history for the correct patient', async () => {
    api.trend.mockResolvedValue([
      {
        id: 1,
        activation_id: 5,
        total_score: 12,
        severity: 'moderate',
        assessed_at: '2026-05-01T10:00:00',
        version: 1,
      },
      {
        id: 2,
        activation_id: 5,
        total_score: 7,
        severity: 'minor',
        assessed_at: '2026-05-02T10:00:00',
        version: 1,
      },
    ]);
    renderWithProviders(<NihssTrendPanel pid={17} />);
    await waitFor(() => expect(api.trend).toHaveBeenCalledWith(17));
    expect(await screen.findByText('2 point(s)')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'NIHSS total score over time' }),
    ).toBeInTheDocument();
  });
});
