import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uk from '@/locales/uk';
// import en from '@/locales/en'; // TODO: uncomment when adding multilingual support
import type { Translations } from '@/locales/uk';

// TODO: restore multilingual support later
// const LOCALES: Record<string, Translations> = { uk, en, 'en-GB': en };
const LOCALES: Record<string, Translations> = { uk };
const STORAGE_KEY = 'app_language';

type I18nContextValue = {
  locale: string;
  t: Translations;
  setLocale: (lang: string) => void;
};

const I18nContext = createContext<I18nContextValue>({
  locale: 'uk',
  t: uk,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState('uk');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && LOCALES[stored]) setLocaleState(stored);
    });
  }, []);

  const setLocale = (lang: string) => {
    if (!LOCALES[lang]) return;
    setLocaleState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang);
  };

  const t = LOCALES[locale] ?? uk;

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
