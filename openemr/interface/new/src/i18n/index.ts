import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enCommon from './en/common.json';
import esCommon from './es/common.json';
import nestClient from '../api/nest-client';

/**
 * Language support for the bilingual (English / Spanish) interface.
 *
 * Startup priority:
 *   1. The authenticated user's saved language preference (when available).
 *   2. An explicit language selection stored in this browser.
 *   3. The server-configured default from /api/config.
 *   4. English (`en`) as the final fallback.
 *
 * A stored preference is never overridden by the server default, and the
 * selected language is persisted across page refreshes and login/logout.
 */

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** localStorage key holding the user's explicit language choice. */
export const LANGUAGE_STORAGE_KEY = 'openrx_lang';
/** localStorage key holding the authenticated user (mirrors useAuth). */
const USER_STORAGE_KEY = 'openemr_user';

const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
};

/** Type guard for a supported language code. */
export function isSupportedLanguage(lng?: string | null): lng is SupportedLanguage {
  return !!lng && (SUPPORTED_LANGUAGES as readonly string[]).includes(lng);
}

/** Language previously chosen explicitly in this browser. */
export function getStoredLanguage(): SupportedLanguage | null {
  try {
    const lng = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(lng) ? lng : null;
  } catch {
    return null;
  }
}

/** Language saved on the authenticated user's profile, when available. */
export function getUserLanguage(): SupportedLanguage | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lng = parsed?.language;
    return isSupportedLanguage(lng) ? lng : null;
  } catch {
    return null;
  }
}

/**
 * Persist the chosen language both globally and (if logged in) on the
 * user record, so it survives refreshes and login/logout.
 */
export function persistLanguage(lng: SupportedLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.language = lng;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

async function getServerLanguage(): Promise<SupportedLanguage> {
  try {
    const r = await nestClient.get('/config');
    const lng = r.data?.language;
    return isSupportedLanguage(lng) ? lng : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Resolve the language to use on startup following the documented priority.
 * The server is only consulted when no user or browser preference exists.
 */
export async function resolveInitialLanguage(): Promise<SupportedLanguage> {
  const userLang = getUserLanguage();
  if (userLang) return userLang;

  const stored = getStoredLanguage();
  if (stored) return stored;

  return getServerLanguage();
}

/**
 * Change the active language immediately (no reload) and persist the choice.
 * Falls back to English for any unsupported code.
 */
export async function setLanguage(lng: string): Promise<void> {
  const next: SupportedLanguage = isSupportedLanguage(lng) ? lng : 'en';
  await i18n.changeLanguage(next);
  persistLanguage(next);
}

export async function initI18n(): Promise<typeof i18n> {
  const language = await resolveInitialLanguage();

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      // Explicit language already encodes the priority above, so the server
      // default is intentionally not force-applied after detection.
      lng: language,
      fallbackLng: 'en',
      supportedLngs: [...SUPPORTED_LANGUAGES],
      ns: ['common'],
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        caches: ['localStorage'],
      },
    });

  return i18n;
}

export default i18n;
