import { useTranslation } from 'react-i18next';
import {
  setLanguage,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  type SupportedLanguage,
} from '../../i18n';

interface LanguageSwitcherProps {
  /**
   * 'light' — for glassy/dark surfaces (e.g. the login card).
   * 'dark'  — for the standard white app chrome (sidebar/top bar).
   */
  variant?: 'light' | 'dark';
}

const LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
};

/** Normalize i18next's region-aware codes (e.g. 'es-MX') to a supported base. */
function baseLanguage(lng?: string): SupportedLanguage {
  if (isSupportedLanguage(lng)) return lng;
  const base = lng?.split('-')[0];
  return isSupportedLanguage(base) ? base : 'en';
}

/**
 * Compact English / Español toggle used across the app. Switching updates the
 * interface immediately (react-i18next re-renders) and persists the choice.
 */
export default function LanguageSwitcher({ variant = 'dark' }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const current = baseLanguage(i18n.language);
  const light = variant === 'light';

  return (
    <div
      className="btn-group btn-group-sm"
      role="group"
      aria-label={t('shell.language')}
    >
      {SUPPORTED_LANGUAGES.map((lng) => {
        const active = current === lng;
        const style = light
          ? {
              borderRadius: '10px',
              padding: '4px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#fff',
              background: active ? 'rgba(0,201,167,0.35)' : 'rgba(255,255,255,0.10)',
              border: active
                ? '1px solid rgba(0,201,167,0.75)'
                : '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(8px)',
            }
          : undefined;
        return (
          <button
            key={lng}
            type="button"
            className={light ? 'btn' : `btn ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => void setLanguage(lng)}
            aria-pressed={active}
            style={style}
          >
            {LABELS[lng]}
          </button>
        );
      })}
    </div>
  );
}
