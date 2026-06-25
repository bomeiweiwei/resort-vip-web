// src/hooks/useTranslation.ts
import { useMemo } from 'react';
import { translations, type Language } from '../i18n/locales';

export const useTranslation = () => {
  const lang = useMemo(() => {
    // 偵測瀏覽器語言，預設給 zh
    const browserLang = navigator.language.split('-')[0] as Language;
    return translations[browserLang] ? browserLang : 'zh';
  }, []);

  const t = (key: keyof typeof translations['zh']) => {
    return translations[lang][key] || translations['zh'][key];
  };

  return { t };
};