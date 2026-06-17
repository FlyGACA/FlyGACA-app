import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ar from './ar.json';

export const LANGS = ['en', 'ar'] as const;
export type Lang = (typeof LANGS)[number];

const STORAGE_KEY = 'flygaca:lang';

/** Picks the initial language: ?lang= → stored choice → browser hint → English. */
function initialLang(): Lang {
  const param = new URLSearchParams(window.location.search).get('lang');
  if (param === 'en' || param === 'ar') return param;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ar') return stored;
  return navigator.language?.startsWith('ar') ? 'ar' : 'en';
}

/** Mirrors <html lang/dir> so RTL flips for the whole document. */
export function applyDocumentLang(lang: Lang): void {
  const el = document.documentElement;
  el.lang = lang;
  el.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocumentLang(i18n.language as Lang);

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  applyDocumentLang(lng as Lang);
});

export default i18n;
