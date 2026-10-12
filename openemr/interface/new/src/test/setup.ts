import '@testing-library/jest-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../i18n/en/common.json';
import esCommon from '../i18n/es/common.json';

/**
 * Boot the i18next singleton with the real catalogue for every test file.
 *
 * Component tests render through `useTranslation()`, which falls back to the
 * global i18next instance; without resources loaded `t('...')` returns the raw
 * key path, so any assertion on user-visible copy fails. Initialising here means
 * component tests see the same English strings the app does.
 *
 * `src/i18n` is deliberately *not* imported: it pulls in the API client, and
 * loading that eagerly would defeat the `vi.mock('../api/nest-client')` in
 * i18n.test.ts (its "/config" assertion depends on the mock being applied).
 * Importing the bare `i18next` package gives the very same singleton instance.
 *
 * The language detector and its localStorage cache stay off, so this neither
 * reads nor writes the stored-preference key the i18n tests assert on.
 */
if (!i18n.isInitialized) {
  await i18n.use(initReactI18next).init({
    resources: { en: { common: enCommon }, es: { common: esCommon } },
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });
}
