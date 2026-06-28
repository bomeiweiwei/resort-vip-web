// src/hooks/useTranslation.ts
import { useMemo } from 'react';
import { translations, type Language } from '../i18n/locales';

export const useTranslation = () => {
  const lang = useMemo(() => {
  // 優先使用後台或系統指定的語言
  const savedLanguage = localStorage.getItem('app-language') as Language | null;

  if (savedLanguage && translations[savedLanguage]) {
    return savedLanguage;
  }

  // 沒有指定時，使用遊客手機／瀏覽器語言
  const browserLanguage = navigator.language
    .split('-')[0] as Language;

  return translations[browserLanguage]
    ? browserLanguage
    : 'zh';
}, []);

  const t = (key: keyof typeof translations['zh']) => {
    return translations[lang][key] || translations['zh'][key];
  };

  return { t, lang };
};