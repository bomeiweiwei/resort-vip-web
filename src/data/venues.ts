export interface AmenityConfig {
  icon: string;
  label: string;
}

export const AMENITY_ICON = {
  parking: { icon: "🅿️", label: "停車場" },
  info: { icon: "ℹ️", label: "服務台" },
  souvenir: { icon: "🛍️", label: "紀念品" },
  nursery: { icon: "👶", label: "哺乳室" },
  restaurant: { icon: "🍽️", label: "餐飲" },
  wifi: { icon: "📶", label: "Wi‑Fi" },
  toilet: { icon: "🚻", label: "化妝室" },
  accessibleToilet: { icon: "♿", label: "無障礙廁所" },
  firstAid: { icon: "⛑️", label: "醫護站" },
  aed: { icon: "❤️‍🔥", label: "AED" },
  cafe: { icon: "☕", label: "咖啡" }
} as const;

export type AmenityKey = keyof typeof AMENITY_ICON;
export type VenueType = 'park' | 'surround' | 'vip';
export type VenueFilter = '全部' | VenueType;

export interface Venue {
  name: string;
  time: string;
  book: boolean;
  coords: [number, number];
  icon: string;
  type: string;
  tags: string[];
  amenities: AmenityKey[];
  note?: string;
  openRange?: { start: string; end: string };
  slotMinutes?: number;
  isBus?: boolean;
  busDirection?: number;
  weatherInfo?: { temp: string; icon: string };
  description?: string;
  busInfo?: string | { route: string; arrivalTime: string };
}
// src/data/venues.ts
// ... (保留你上面貼的那段 type 和 interface 定義) ...

// 👇 在檔案最下方補上這個真實資料陣列，並確保加上 export
export const VENUE_DATA: Venue[] = [
    {
      name: "售票口",
      time: "09:00-17:00",
      book: false,
      coords: [24.703143, 121.820413],
      icon: "🎫",
      type: "park",
      tags: ["ticket", "info"],
      amenities: ["info", "toilet", "accessibleToilet", "aed", "souvenir"]
    },
    {
      name: "停車場",
      time: "09:00-17:00",
      book: false,
      coords: [24.702973, 121.820658],
      icon: "🅿️",
      type: "park",
      tags: ["parking"],
      amenities: ["parking"]
    },
    {
      name: "綠舞島",
      time: "09:00-17:00",
      book: false,
      coords: [24.702529, 121.820073],
      icon: "🏝️",
      type: "park",
      tags: ["island"],
      amenities: []
    },
    {
      name: "綠舞國際觀光飯店",
      time: "24H",
      book: false,
      coords: [24.702807, 121.818702],
      icon: "🏨",
      type: "park",
      tags: ["hotel", "restaurant"],
      amenities: ["restaurant", "wifi", "parking", "firstAid", "aed"]
    },
    {
      name: "綠舞Villa",
      time: "24H",
      book: true,
      coords: [24.702707, 121.819630],
      icon: "🏡",
      type: "park",
      tags: ["villa", "hotel"],
      amenities: ["wifi"],
      openRange: { start: "15:00", end: "22:00" },
      slotMinutes: 30
    },
    {
      name: "露營區",
      time: "24H",
      book: true,
      coords: [24.70287, 121.81782],
      icon: "🏕️",
      type: "park",
      tags: ["camping"],
      amenities: ["toilet"],
      openRange: { start: "15:00", end: "23:00" },
      slotMinutes: 60
    },
    {
      name: "遊客中心",
      time: "09:00-17:00",
      book: false,
      coords: [24.702071, 121.820266],
      icon: "ℹ️",
      type: "park",
      tags: ["info", "toilet", "souvenir"],
      amenities: ["info", "toilet", "accessibleToilet", "souvenir", "wifi"],
      note: "牧草購買處"
    },
    {
      name: "忍者之森廣場",
      time: "09:00-17:00",
      book: false,
      coords: [24.702317, 121.819252],
      icon: "🥷",
      type: "park",
      tags: ["activity", "spot"],
      amenities: []
    },
    {
      name: "天空之鏡",
      time: "09:00-17:00",
      book: false,
      coords: [24.701408, 121.820553],
      icon: "📸",
      type: "park",
      tags: ["spot"],
      amenities: []
    },
    {
      name: "綠舞美術館",
      time: "09:00-17:00",
      book: false,
      coords: [24.70192, 121.81970],
      icon: "🎨",
      type: "park",
      tags: ["museum", "must"],
      amenities: ["toilet", "wifi"]
    },
    {
      name: "探索樂園",
      time: "09:00-17:00",
      book: false,
      coords: [24.701357, 121.819402],
      icon: "🏹",
      type: "park",
      tags: ["playground", "family"],
      amenities: ["toilet", "wifi"]
    },
    {
      name: "綠舞展演廳",
      time: "09:00-17:30",
      book: false,
      coords: [24.701430, 121.819738],
      icon: "🎭",
      type: "park",
      tags: ["show", "must"],
      amenities: ["toilet"]
    },
    {
      name: "島兒鹿鹿",
      time: "09:30-16:30",
      book: false,
      coords: [24.702461, 121.820346],
      icon: "🦌",
      type: "park",
      tags: ["animal", "family", "spot"],
      amenities: ["toilet"]
    },
    {
      name: "萌寵互動區",
      time: "10:00-17:00",
      book: false,
      coords: [24.701511, 121.820636],
      icon: "🦫",
      type: "park",
      tags: ["cafe", "spot"],
      amenities: ["cafe", "wifi"],
      openRange: { start: "10:00", end: "17:00" },
      slotMinutes: 30
    },
    {
      name: "日光璽舞",
      time: "11:00-20:00",
      book: true,
      coords: [24.701805, 121.820590],
      icon: "🍝",
      type: "park",
      tags: ["restaurant"],
      amenities: ["restaurant"],
      openRange: { start: "11:00", end: "20:00" },
      slotMinutes: 30
    },
    {
      name: "高爾夫球室",
      time: "11:00-20:00",
      book: true,
      coords: [24.703199, 121.819485],
      icon: "⛳",
      type: "park",
      tags: ["golf"],
      amenities: []
    },
    {
      name: "大眾北路站 (南下)",
      time: "平日 4 班",
      book: false,
      isBus: true,
      busDirection: 0,
      coords: [24.70068, 121.82181],
      icon: "🚌",
      type: "surround",
      tags: ["bus"],
      amenities: []
    },
    {
      name: "大眾北路站 (北上)",
      time: "平日 4 班",
      book: false,
      isBus: true,
      busDirection: 1,
      coords: [24.70058, 121.82232],
      icon: "🚌",
      type: "surround",
      tags: ["bus"],
      amenities: []
    }
];