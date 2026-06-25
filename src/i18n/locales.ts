// src/i18n/locales.ts
export const translations = {
  zh: { all: "全部", park: "園區設施", surround: "周邊", vip: "VIP", nav: "前往導航" },
  en: { all: "All", park: "Facilities", surround: "Surroundings", vip: "VIP", nav: "Navigate" },
  ja: { all: "すべて", park: "施設", surround: "周辺", vip: "VIP", nav: "ナビ開始" },
  ko: { all: "전체", park: "시설", surround: "주변", vip: "VIP", nav: "길찾기" }
} as const;

export type Language = keyof typeof translations;