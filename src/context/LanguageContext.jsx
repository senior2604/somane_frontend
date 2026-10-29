import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ENGLISH_TRANSLATIONS } from '../i18n/catalogs';
import { CHINESE_TRANSLATIONS } from '../i18n/chinese';

const LanguageContext = createContext(null);

export function normalizeLanguage(value) {
  const normalized = String(value || '').trim().replace('-', '_');
  if (!normalized) return 'fr_FR';
  const [language, region, ...variant] = normalized.split('_');
  if (!language) return 'fr_FR';
  const normalizedLanguage = language.toLowerCase();
  if (!region) {
    if (normalizedLanguage === 'en') return 'en_US';
    if (normalizedLanguage === 'fr') return 'fr_FR';
    return normalizedLanguage;
  }
  return [normalizedLanguage, region.toUpperCase(), ...variant].join('_');
}

function readSavedLanguage() {
  try {
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    return normalizeLanguage(user?.lang || localStorage.getItem('erp_language') || 'fr_FR');
  } catch {
    return normalizeLanguage(localStorage.getItem('erp_language') || 'fr_FR');
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readSavedLanguage);
  const [direction, setDirection] = useState(() => localStorage.getItem('erp_language_direction') || 'ltr');
  const [serverTranslations, setServerTranslations] = useState({});

  const setLanguage = useCallback((nextLanguage, nextDirection) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLanguageState(normalized);
    localStorage.setItem('erp_language', normalized);
    if (nextDirection) {
      const normalizedDirection = String(nextDirection).toUpperCase() === 'RTL' ? 'rtl' : 'ltr';
      setDirection(normalizedDirection);
      localStorage.setItem('erp_language_direction', normalizedDirection);
    }
  }, []);

  const setTranslations = useCallback((translations) => {
    setServerTranslations(
      translations && typeof translations === 'object' && !Array.isArray(translations)
        ? translations
        : {},
    );
  }, []);

  useEffect(() => {
    const languageTag = language.toLowerCase().replace('_', '-');
    document.documentElement.lang = languageTag;
    document.documentElement.dir = direction;
  }, [direction, language]);

  useEffect(() => {
    const syncFromStorage = (event) => {
      if (event.key !== 'user_data' && event.key !== 'erp_language') return;
      setLanguageState(readSavedLanguage());
    };
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const translate = useCallback((source, fallback) => {
    const text = String(source ?? '');
    if (serverTranslations[text]) return serverTranslations[text];
    if (language.startsWith('en')) return ENGLISH_TRANSLATIONS[text] || fallback || text;
    if (language.startsWith('zh')) {
      return CHINESE_TRANSLATIONS[text] || ENGLISH_TRANSLATIONS[text] || fallback || text;
    }
    return fallback || text;
  }, [language, serverTranslations]);

  const value = useMemo(() => ({
    language,
    languageTag: language.toLowerCase().replace('_', '-'),
    direction,
    setLanguage,
    setTranslations,
    t: translate,
    formatDate: (value, options) => value
      ? new Intl.DateTimeFormat(language.toLowerCase().replace('_', '-'), options).format(new Date(value))
      : '',
    formatNumber: (value, options) => new Intl.NumberFormat(language.toLowerCase().replace('_', '-'), options).format(value),
  }), [direction, language, setLanguage, setTranslations, translate]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage doit être utilisé dans LanguageProvider');
  return value;
}
