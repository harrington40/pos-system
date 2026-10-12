import nestClient from '../nest-client';
import i18n from '../../i18n';

/**
 * Emergency department endpoints.
 *
 * `board` and `getForPatient` are what the board and the chart read; `preview`
 * exists so the triage form can show the colour before anything is written.
 */

export interface TriageVitalsInput {
  bps?: number | string;
  bpd?: number | string;
  pulse?: number | string;
  respiration?: number | string;
  temperature?: number | string;
  oxygen_saturation?: number | string;
  painScore?: number | string;
}

export interface TriageRequest {
  chiefComplaint?: string;
  mode?: string;
  vitals?: TriageVitalsInput;
  resources?: number | null;
  painScore?: number | null;
  pregnant?: boolean;
  gestationalWeeks?: number | null;
  immunocompromised?: boolean;
  anticoagulated?: boolean;
  sickleCell?: boolean;
  saveVitals?: boolean;
  room?: string;
  providerId?: number | null;
  note?: string;
  overrideReason?: string;
}

export async function getEmergencyBoard() {
  const r = await nestClient.get('/emergency/board');
  return r.data;
}

export async function getEmergencyStats(days = 7) {
  const r = await nestClient.get('/emergency/stats', { params: { days } });
  return r.data;
}

export async function getEmergencyEscalations(limit = 25) {
  const r = await nestClient.get('/emergency/escalations', { params: { limit } });
  return r.data;
}

export async function previewTriage(pid: number | string, body: TriageRequest) {
  const r = await nestClient.post(`/emergency/patients/${pid}/preview`, body);
  return r.data;
}

export async function startTriage(pid: number | string, body: TriageRequest) {
  const r = await nestClient.post(`/emergency/patients/${pid}/triage`, body);
  return r.data;
}

export async function reassessVisit(visitId: number, body: TriageRequest) {
  const r = await nestClient.post(`/emergency/visits/${visitId}/reassess`, body);
  return r.data;
}

export async function updateVisitStatus(
  visitId: number,
  body: { status: string; room?: string; disposition?: string; providerId?: number | null },
) {
  const r = await nestClient.patch(`/emergency/visits/${visitId}/status`, body);
  return r.data;
}

export async function getPatientEmergency(pid: number | string) {
  const r = await nestClient.get(`/emergency/patients/${pid}`);
  return r.data;
}

/** Administrative: escalate everyone past their target now instead of waiting for the timer. */
export async function escalateOverdueNow() {
  const r = await nestClient.post('/emergency/escalate-overdue');
  return r.data;
}

export interface EmergencyErrorState {
  /** One line: what went wrong, in the user's terms. */
  title: string;
  /** What they can do about it. */
  detail: string;
  /** False when retrying cannot possibly help (a role is not permitted). */
  canRetry: boolean;
  /** HTTP status, when the request reached the server. */
  status: number | null;
}

/**
 * Translate a catalogue key when the app has booted i18n, and fall back to the
 * English literal otherwise. The literals below are what the tests assert, so
 * the literal stays the contract and the catalogue is only ever a translation
 * of it — a missing key degrades to English, never to a dotted key path.
 */
const tr = (key: string, english: string, options?: Record<string, unknown>): string =>
  i18n.isInitialized ? (i18n.t(key, { ...options, defaultValue: english }) as string) : english;

/**
 * Turn a failed request into something a clinician can act on.
 *
 * The metrics tab used to spin forever on any failure, because "no data yet"
 * and "the request was rejected" looked identical in the UI. They are not the
 * same thing and the difference matters: a 403 means the figures are deliberately
 * withheld for that role and retrying is pointless, while a 5xx or a dropped
 * connection is worth another try.
 */
export function describeEmergencyError(err: any): EmergencyErrorState {
  const status = Number(err?.response?.status) || null;
  const serverMessage = err?.response?.data?.message;

  if (status === 401) {
    return {
      title: tr('emergency.error.sessionTitle', 'Your session has expired'),
      detail: tr('emergency.error.sessionDetail', 'Sign in again to see the metrics.'),
      canRetry: false,
      status,
    };
  }
  if (status === 403) {
    return {
      title: tr('emergency.error.roleTitle', 'Departmental metrics are not available for your role'),
      detail: tr('emergency.error.roleDetail', 'Throughput and safety figures are limited to clinical staff (admin, physician, nurse, midwife). The board itself is unaffected.'),
      canRetry: false,
      status,
    };
  }
  if (status && status >= 500) {
    return {
      title: tr('emergency.error.serverTitle', 'The server could not produce the metrics'),
      detail: typeof serverMessage === 'string' && serverMessage
        ? serverMessage
        : tr('emergency.error.serverDetail', 'This is a fault at our end, not something you did. Try again in a moment.'),
      canRetry: true,
      status,
    };
  }
  if (!status) {
    return {
      title: tr('emergency.error.networkTitle', 'Could not reach the server'),
      detail: tr('emergency.error.networkDetail', 'The network or the server is unreachable. Check the connection and try again.'),
      canRetry: true,
      status: null,
    };
  }
  return {
    title: tr('emergency.error.unknownTitle', 'Could not load the metrics'),
    detail: typeof serverMessage === 'string' && serverMessage
      ? serverMessage
      : tr('emergency.error.unknownDetail', 'The request was rejected ({{status}}).', { status }),
    canRetry: true,
    status,
  };
}
