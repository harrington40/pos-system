import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

// Mock the API client so the server-configured default can be controlled.
vi.mock('../api/nest-client', () => ({
  default: { get: vi.fn() },
}));

import nestClient from '../api/nest-client';
import i18n, {
  initI18n,
  setLanguage,
  resolveInitialLanguage,
  getStoredLanguage,
  getUserLanguage,
  persistLanguage,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
} from '../i18n';

import enCommon from '../i18n/en/common.json';
import esCommon from '../i18n/es/common.json';

const mockGet = vi.mocked(nestClient.get);
const USER_KEY = 'openemr_user';

/** Flatten a nested resource object into dotted key paths (arrays are leaves). */
function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

const serverLanguage = (language: string) =>
  mockGet.mockResolvedValue({ data: { language } } as never);

describe('i18n language handling', () => {
  beforeAll(async () => {
    serverLanguage('en');
    await initI18n();
  });

  beforeEach(async () => {
    // Reset runtime language first (this may re-cache), then clear storage so
    // each test starts from a clean slate.
    await i18n.changeLanguage('en');
    localStorage.clear();
    vi.clearAllMocks();
    serverLanguage('en');
  });

  it('exposes English and Spanish as the supported languages', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'es']);
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('es')).toBe(true);
    expect(isSupportedLanguage('fr')).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
    expect(isSupportedLanguage(undefined)).toBe(false);
  });

  it('persists the selected language and remembers it for the logged-in user', async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ username: 'dr', token: 'x' }));

    await setLanguage('es');

    expect(i18n.language).toBe('es');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es');
    expect(getStoredLanguage()).toBe('es');
    expect(getUserLanguage()).toBe('es');
    expect(JSON.parse(localStorage.getItem(USER_KEY)!).language).toBe('es');
  });

  it('switches translations immediately between English and Spanish', async () => {
    await setLanguage('en');
    expect(i18n.t('auth.login')).toBe('Sign In');
    expect(i18n.t('auth.username')).toBe('Username');
    expect(i18n.t('login.brand')).toBe('OpenRx Health');

    await setLanguage('es');
    expect(i18n.t('auth.login')).toBe('Iniciar Sesión');
    expect(i18n.t('auth.username')).toBe('Usuario');
    expect(i18n.t('login.brand')).toBe('OpenRx Health');

    await setLanguage('en');
    expect(i18n.t('auth.login')).toBe('Sign In');
  });

  it('falls back to English for unsupported language codes', async () => {
    expect(getStoredLanguage()).toBeNull();
    await setLanguage('de');
    expect(i18n.language).toBe('en');
  });

  it('persists the choice across logout (survives user-record removal)', () => {
    persistLanguage('es');
    localStorage.removeItem(USER_KEY);
    expect(getStoredLanguage()).toBe('es');
  });

  describe('startup priority', () => {
    it('prefers the authenticated user language over browser and server', async () => {
      localStorage.setItem(USER_KEY, JSON.stringify({ username: 'dr', language: 'es' }));
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
      serverLanguage('en');

      expect(await resolveInitialLanguage()).toBe('es');
    });

    it('prefers the browser selection over the server default', async () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'es');
      serverLanguage('en');

      expect(await resolveInitialLanguage()).toBe('es');
    });

    it('uses the server-configured language when nothing is saved', async () => {
      serverLanguage('es');

      expect(await resolveInitialLanguage()).toBe('es');
      expect(mockGet).toHaveBeenCalledWith('/config');
    });

    it('falls back to English when the server value is unsupported', async () => {
      serverLanguage('fr');
      expect(await resolveInitialLanguage()).toBe('en');
    });

    it('falls back to English when the server is unavailable', async () => {
      mockGet.mockRejectedValue(new Error('network'));
      expect(await resolveInitialLanguage()).toBe('en');
    });
  });

  describe('translation catalog', () => {
    it('has identical key sets in English and Spanish', () => {
      expect(flatten(esCommon).sort()).toEqual(flatten(enCommon).sort());
    });

    it('translates navigation (shell) keys dynamically', async () => {
      await setLanguage('en');
      expect(i18n.t('shell.items.triageBoard')).toBe('Triage Board');
      expect(i18n.t('shell.sections.laboratory')).toBe('Laboratory');

      await setLanguage('es');
      expect(i18n.t('shell.items.triageBoard')).toBe('Tablero de Triaje');
      expect(i18n.t('shell.sections.laboratory')).toBe('Laboratorio');
    });

    it('renders plural forms for the license countdown banner', async () => {
      await setLanguage('en');
      expect(i18n.t('shell.licenseTrial', { count: 1 })).toContain('1 day.');
      expect(i18n.t('shell.licenseTrial', { count: 3 })).toContain('3 days.');

      await setLanguage('es');
      expect(i18n.t('shell.licenseTrial', { count: 1 })).toContain('1 día');
      expect(i18n.t('shell.licenseTrial', { count: 3 })).toContain('3 días');
    });
  });
});
