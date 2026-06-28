/**
 * 景點與設施資料
 *
 * 這份檔案負責：
 * 1. 定義園區設施圖示
 * 2. 定義景點資料的 TypeScript 型別
 * 3. 保存園區固定景點與周邊公車站資料
 */

/* =========================================================
   設施圖示設定
   ========================================================= */

/**
 * 每一個設施圖示都必須包含：
 * icon：畫面顯示的圖示
 * label：滑鼠停留時顯示的中文名稱
 */
export interface AmenityConfig {
  icon: string;
  label: string;
}

/**
 * 園區內可使用的設施圖示。
 *
 * 景點資料中的 amenities 必須使用這裡已經存在的代碼，
 * 例如：
 * amenities: ['toilet', 'wifi']
 */
export const AMENITY_ICON = {
  parking: {
    icon: '🅿️',
    label: '停車場'
  },
  info: {
    icon: 'ℹ️',
    label: '服務台'
  },
  souvenir: {
    icon: '🛍️',
    label: '紀念品'
  },
  nursery: {
    icon: '👶',
    label: '哺乳室'
  },
  restaurant: {
    icon: '🍽️',
    label: '餐飲'
  },
  wifi: {
    icon: '📶',
    label: 'Wi-Fi'
  },
  toilet: {
    icon: '🚻',
    label: '化妝室'
  },
  accessibleToilet: {
    icon: '♿',
    label: '無障礙廁所'
  },
  firstAid: {
    icon: '⛑️',
    label: '醫護站'
  },
  aed: {
    icon: '❤️‍🔥',
    label: 'AED'
  },
  cafe: {
    icon: '☕',
    label: '咖啡'
  }
} as const satisfies Record<string, AmenityConfig>;

/**
 * 自動取得 AMENITY_ICON 的所有有效代碼。
 *
 * 目前包含：
 * parking、info、souvenir、nursery、restaurant、
 * wifi、toilet、accessibleToilet、firstAid、aed、cafe
 */
export type AmenityKey = keyof typeof AMENITY_ICON;


/* =========================================================
   景點型別設定
   ========================================================= */

/**
 * 景點分類：
 * park：園區內設施
 * surround：園區周邊景點
 * vip：使用者加入的 VIP 行程
 */
export type VenueType = 'park' | 'surround' | 'vip';

/**
 * 地圖上方的篩選分類。
 *
 * all：顯示全部景點
 * 其餘值沿用 VenueType
 */
export type VenueFilter = 'all' | VenueType;

/**
 * 單一景點資料格式。
 */
export interface Venue {
  /** 景點名稱 */
  name: string;

  /** 營業時間或補充時間資訊 */
  time: string;

  /** 是否提供預約功能 */
  book: boolean;

  /** 景點座標：[緯度, 經度] */
  coords: [number, number];

  /** 地圖 Marker 顯示圖示 */
  icon: string;

  /** 景點分類 */
  type: VenueType;

  /** 景點標籤，可供搜尋或推薦功能使用 */
  tags: string[];

  /** 景點提供的設施 */
  amenities: AmenityKey[];

  /** 額外說明文字 */
  note?: string;

  /**
   * 可預約的開始與結束時間。
   * 只有 book 為 true 的景點才需要設定。
   */
  openRange?: {
    start: string;
    end: string;
  };

  /** 每一個預約時段的分鐘數 */
  slotMinutes?: number;

  /** 是否為公車站 */
  isBus?: boolean;

  /**
   * 公車方向：
   * 0：南下
   * 1：北上
   */
  busDirection?: 0 | 1;
}


/* =========================================================
   固定景點資料
   ========================================================= */

/**
 * 園區固定景點與公車站資料。
 *
 * 資料庫取得的周邊推薦景點不放在這裡，
 * 而是在 MapPage.tsx 中透過 getAttractions() 載入。
 */
export const VENUE_DATA: Venue[] = [
  {
    name: '售票口',
    time: '09:00-17:00',
    book: false,
    coords: [24.703143, 121.820413],
    icon: '🎫',
    type: 'park',
    tags: ['ticket', 'info'],
    amenities: [
      'info',
      'toilet',
      'accessibleToilet',
      'aed',
      'souvenir'
    ]
  },
  {
    name: '停車場',
    time: '09:00-17:00',
    book: false,
    coords: [24.702973, 121.820658],
    icon: '🅿️',
    type: 'park',
    tags: ['parking'],
    amenities: ['parking', 'toilet']
  },
  {
    name: '綠舞島',
    time: '09:00-17:00',
    book: false,
    coords: [24.70257, 121.820073],
    icon: '🏝️',
    type: 'park',
    tags: ['island'],
    amenities: []
  },
  {
    name: '綠舞國際觀光飯店',
    time: '24H',
    book: false,
    coords: [24.70283, 121.818702],
    icon: '🏨',
    type: 'park',
    tags: ['hotel', 'restaurant'],
    amenities: [
      'restaurant',
      'wifi',
      'parking',
      'firstAid',
      'aed'
    ]
  },
  {
    name: '綠舞Villa',
    time: '24H',
    book: true,
    coords: [24.702707, 121.8196],
    icon: '🏡',
    type: 'park',
    tags: ['villa', 'hotel'],
    amenities: ['wifi'],
    openRange: {
      start: '15:00',
      end: '22:00'
    },
    slotMinutes: 30
  },
  {
    name: '露營區',
    time: '24H',
    book: true,
    coords: [24.70287, 121.81782],
    icon: '🏕️',
    type: 'park',
    tags: ['camping'],
    amenities: ['toilet'],
    openRange: {
      start: '15:00',
      end: '23:00'
    },
    slotMinutes: 60
  },
  {
    name: '遊客中心',
    time: '09:00-17:00',
    book: false,
    coords: [24.702071, 121.820266],
    icon: 'ℹ️',
    type: 'park',
    tags: ['info', 'toilet', 'souvenir'],
    amenities: [
      'info',
      'toilet',
      'accessibleToilet',
      'souvenir',
      'wifi'
    ],
    note: '牧草購買處'
  },
  {
    name: '忍者之森廣場',
    time: '09:00-17:00',
    book: false,
    coords: [24.70238, 121.819252],
    icon: '🥷',
    type: 'park',
    tags: ['activity', 'spot'],
    amenities: []
  },
  {
    name: '天空之鏡',
    time: '09:00-17:00',
    book: false,
    coords: [24.70141, 121.82045],
    icon: '📸',
    type: 'park',
    tags: ['spot'],
    amenities: []
  },
  {
    name: '綠舞美術館',
    time: '09:00-17:00',
    book: false,
    coords: [24.70193, 121.8197],
    icon: '🎨',
    type: 'park',
    tags: ['museum', 'must'],
    amenities: ['toilet', 'wifi']
  },
  {
    name: '探索樂園',
    time: '09:00-17:00',
    book: false,
    coords: [24.7014, 121.819402],
    icon: '🏹',
    type: 'park',
    tags: ['playground', 'family'],
    amenities: ['toilet', 'wifi']
  },
  {
    name: '綠舞展演廳',
    time: '09:00-17:30',
    book: false,
    coords: [24.70143, 121.819738],
    icon: '🎭',
    type: 'park',
    tags: ['show', 'must'],
    amenities: ['toilet']
  },
  {
    name: '島兒鹿鹿',
    time: '09:30-16:30',
    book: false,
    coords: [24.70253, 121.820346],
    icon: '🦌',
    type: 'park',
    tags: ['animal', 'family', 'spot'],
    amenities: ['toilet']
  },
  {
    name: '萌寵互動區',
    time: '10:00-17:00',
    book: false,
    coords: [24.70155, 121.82065],
    icon: '🦫',
    type: 'park',
    tags: ['cafe', 'spot'],
    amenities: ['cafe', 'wifi'],
    openRange: {
      start: '10:00',
      end: '17:00'
    },
    slotMinutes: 30
  },
  {
    name: '櫻花長廊',
    time: '11:00-20:00',
    book: true,
    coords: [24.70182, 121.82059],
    icon: '🍝',
    type: 'park',
    tags: ['restaurant'],
    amenities: ['restaurant'],
    openRange: {
      start: '11:00',
      end: '20:00'
    },
    slotMinutes: 30
  },
  {
    name: '高爾夫球室',
    time: '11:00-20:00',
    book: true,
    coords: [24.70325, 121.819485],
    icon: '⛳',
    type: 'park',
    tags: ['golf'],
    amenities: ['toilet']
  },

  /* 周邊公車站 */
  {
    name: '大眾北路站 (南下)',
    time: '平日 4 班',
    book: false,
    isBus: true,
    busDirection: 0,
    coords: [24.70075, 121.82175],
    icon: '🚌',
    type: 'surround',
    tags: ['bus'],
    amenities: []
  },
  {
    name: '大眾北路站 (北上)',
    time: '平日 4 班',
    book: false,
    isBus: true,
    busDirection: 1,
    coords: [24.7006, 121.8224],
    icon: '🚌',
    type: 'surround',
    tags: ['bus'],
    amenities: []
  }
];
