import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  VENUE_DATA,
  AMENITY_ICON,
  type Venue,
  type VenueFilter,
} from "../data/venues";
import { useTranslation } from "../hooks/useTranslation";
import { fetchWeather } from "../services/api";
import {
  PARK_CENTER,
  PARK_RADIUS,
  PARK_ROUTES,
  PARK_ACCESS_POINTS,
  PARK_AVOID_NODES,
  PARK_FORCE_WAYPOINTS,
  PARK_FIXED_ROUTES,
} from "../data/parkGraph";
import userPikminImage from "../assets/user-pikmin-animated.gif";
import { getAttractions } from "../apis/attractionApi";

type ExtendedVenue = Venue;

type RoutePoint = [number, number];

const FILTER_BUTTONS: { id: VenueFilter }[] = [
  { id: "all" },
  { id: "park" },
  { id: "surround" },
  { id: "vip" },
];

const ENTRY_COORDS: RoutePoint = [24.703143, 121.820413];
const DAZHONG_NORTH_GO_TIMES = ["07:10", "12:30", "16:40", "18:20"];
const DAZHONG_NORTH_RETURN_TIMES = ["07:25", "12:45", "16:55", "18:35"];

type SupportedLanguage = "zh" | "en" | "ja" | "ko";

const VENUE_NAME_TRANSLATIONS: Record<
  string,
  Partial<Record<SupportedLanguage, string>>
> = {
  售票口: {
    en: "Ticket Office",
    ja: "チケット売り場",
    ko: "매표소",
  },
  停車場: {
    en: "Parking Lot",
    ja: "駐車場",
    ko: "주차장",
  },
  綠舞島: {
    en: "Dancewoods Island",
    ja: "グリーンダンス島",
    ko: "그린댄스 아일랜드",
  },
  綠舞國際觀光飯店: {
    en: "Dancewoods Hotels & Resorts",
    ja: "グリーンダンス国際観光ホテル",
    ko: "댄스우즈 호텔 앤 리조트",
  },
  綠舞Villa: {
    en: "Dancewoods Villa",
    ja: "グリーンダンス・ヴィラ",
    ko: "댄스우즈 빌라",
  },
  露營區: {
    en: "Camping Area",
    ja: "キャンプエリア",
    ko: "캠핑장",
  },
  遊客中心: {
    en: "Visitor Center",
    ja: "ビジターセンター",
    ko: "방문자 센터",
  },
  忍者之森廣場: {
    en: "Ninja Forest Plaza",
    ja: "忍者の森広場",
    ko: "닌자 숲 광장",
  },
  天空之鏡: {
    en: "Mirror of the Sky",
    ja: "天空の鏡",
    ko: "하늘의 거울",
  },
  綠舞美術館: {
    en: "Dancewoods Art Museum",
    ja: "グリーンダンス美術館",
    ko: "댄스우즈 미술관",
  },
  探索樂園: {
    en: "Adventure Park",
    ja: "アドベンチャーパーク",
    ko: "어드벤처 파크",
  },
  綠舞展演廳: {
    en: "Dancewoods Performance Hall",
    ja: "グリーンダンス公演ホール",
    ko: "댄스우즈 공연장",
  },
  島兒鹿鹿: {
    en: "Deer Island",
    ja: "シカの島",
    ko: "사슴 아일랜드",
  },
  萌寵互動區: {
    en: "Animal Interaction Area",
    ja: "動物ふれあいエリア",
    ko: "동물 교감 구역",
  },
  日光璽舞: {
    en: "Sunlight Restaurant",
    ja: "サンライト・レストラン",
    ko: "선라이트 레스토랑",
  },
  高爾夫球室: {
    en: "Golf Room",
    ja: "ゴルフルーム",
    ko: "골프룸",
  },
  "大眾北路站 (南下)": {
    en: "Dazhong North Road Stop (Southbound)",
    ja: "大衆北路バス停（南行）",
    ko: "다중북로 정류장 (남행)",
  },
  "大眾北路站 (北上)": {
    en: "Dazhong North Road Stop (Northbound)",
    ja: "大衆北路バス停（北行）",
    ko: "다중북로 정류장 (북행)",
  },
};

const getWeatherEmoji = (desc: string) => {
  const d = desc.toLowerCase();
  if (d.includes("雨") || d.includes("rain")) return "🌧️";
  if (d.includes("雲") || d.includes("cloud")) return "⛅";
  if (d.includes("晴") || d.includes("clear")) return "☀️";
  return "🌤️";
};

const iconCache = new Map<string, L.DivIcon>();

const getIcon = (emoji: string) => {
  if (!iconCache.has(emoji)) {
    iconCache.set(
      emoji,
      L.divIcon({
        className: "",
        html: `<div style="font-size:48px;width:60px;height:60px;transform:scale(.5);transform-origin:top left;display:flex;align-items:center;justify-content:center;">${emoji}</div>`,
        iconSize: [38, 38],
        iconAnchor: [15, 15],
      }),
    );
  }
  return iconCache.get(emoji)!;
};

const userIcon = L.icon({
  iconUrl: userPikminImage,
  iconSize: [100, 100],
  iconAnchor: [30, 60],
  className: "user-location-icon",
});

const calculateRouteBearing = (start: RoutePoint, end: RoutePoint) => {
  const startLat = (start[0] * Math.PI) / 180;
  const startLng = (start[1] * Math.PI) / 180;
  const endLat = (end[0] * Math.PI) / 180;
  const endLng = (end[1] * Math.PI) / 180;

  const differenceLng = endLng - startLng;

  const y = Math.sin(differenceLng) * Math.cos(endLat);

  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(differenceLng);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return (bearing + 360) % 360;
};

const getRouteFootprintIcon = (bearing: number) =>
  L.divIcon({
    className: "",
    html: `
      <div
        style="
          width:22px;
          height:22px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:18px;
          line-height:1;
          opacity:0.75;
          transform:rotate(${bearing}deg);
          transform-origin:center;
          filter:
            drop-shadow(0 1px 1px rgba(255,255,255,.95))
            drop-shadow(0 0 2px rgba(255,255,255,.8));
        "
      >
        👣
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const getNextDeparture = (times: string[]) => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const time of times) {
    const [h, m] = time.split(":").map(Number);
    const target = h * 60 + m;
    if (target >= nowMinutes) {
      return {
        time,
        minutesLeft: target - nowMinutes,
      };
    }
  }

  return null;
};

const pointKey = (point: RoutePoint) =>
  `${point[0].toFixed(6)},${point[1].toFixed(6)}`;

type GraphEdge = { key: string; weight: number };
type ParkGraph = {
  graph: Map<string, GraphEdge[]>;
  points: Map<string, RoutePoint>;
};

const buildParkGraph = (routes: RoutePoint[][]): ParkGraph => {
  const graph = new Map<string, GraphEdge[]>();
  const points = new Map<string, RoutePoint>();

  const ensureNode = (point: RoutePoint) => {
    const key = pointKey(point);
    if (!graph.has(key)) graph.set(key, []);
    if (!points.has(key)) points.set(key, point);
    return key;
  };

  const addEdge = (a: RoutePoint, b: RoutePoint, isAuto = false) => {
    const keyA = ensureNode(a);
    const keyB = ensureNode(b);
    const distance = L.latLng(a[0], a[1]).distanceTo(L.latLng(b[0], b[1]));
    const weight = isAuto ? distance * 6 : distance;

    graph.get(keyA)!.push({ key: keyB, weight });
    graph.get(keyB)!.push({ key: keyA, weight });
  };

  routes.forEach((route) => {
    route.forEach((point, index) => {
      ensureNode(point);
      if (index < route.length - 1) {
        addEdge(point, route[index + 1], false);
      }
    });
  });

  const allPoints = Array.from(points.values());
  const connectThreshold = 25;

  for (let i = 0; i < allPoints.length; i += 1) {
    for (let j = i + 1; j < allPoints.length; j += 1) {
      const a = allPoints[i];
      const b = allPoints[j];
      const distance = L.latLng(a[0], a[1]).distanceTo(L.latLng(b[0], b[1]));

      if (distance > 0 && distance <= connectThreshold) {
        addEdge(a, b, true);
      }
    }
  }

  return { graph, points };
};

const PARK_GRAPH_DATA = buildParkGraph(PARK_ROUTES);

const findNearestGraphNode = (
  lat: number,
  lng: number,
  points: Map<string, RoutePoint>,
) => {
  let bestKey: string | null = null;
  let minDistance = Infinity;

  for (const [key, point] of points.entries()) {
    const distance = L.latLng(lat, lng).distanceTo(
      L.latLng(point[0], point[1]),
    );

    if (distance < minDistance) {
      minDistance = distance;
      bestKey = key;
    }
  }

  return bestKey;
};

const dijkstraShortestPath = (
  graph: Map<string, GraphEdge[]>,
  startKey: string,
  endKey: string,
  avoidKeys: string[] = [],
) => {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();
  const avoidSet = new Set(avoidKeys);

  for (const key of graph.keys()) {
    distances.set(key, Infinity);
    previous.set(key, null);
  }

  distances.set(startKey, 0);

  while (true) {
    let current: string | null = null;
    let currentDistance = Infinity;

    for (const [key, distance] of distances.entries()) {
      if (
        !visited.has(key) &&
        !avoidSet.has(key) &&
        distance < currentDistance
      ) {
        current = key;
        currentDistance = distance;
      }
    }

    if (current === null || current === endKey) break;

    visited.add(current);

    const neighbors = graph.get(current) ?? [];

    neighbors.forEach(({ key: nextKey, weight }) => {
      if (visited.has(nextKey) || avoidSet.has(nextKey)) return;

      const alternative = currentDistance + weight;
      if (alternative < (distances.get(nextKey) ?? Infinity)) {
        distances.set(nextKey, alternative);
        previous.set(nextKey, current);
      }
    });
  }

  const path: string[] = [];
  let cursor: string | null = endKey;

  while (cursor) {
    path.unshift(cursor);
    cursor = previous.get(cursor) ?? null;
  }

  return path[0] === startKey ? path : null;
};

const isInsidePark = (lat: number, lng: number) =>
  L.latLng(PARK_CENTER[0], PARK_CENTER[1]).distanceTo(L.latLng(lat, lng)) <=
  PARK_RADIUS;

const buildParkNavigationRoute = (
  start: RoutePoint,
  target: ExtendedVenue,
): RoutePoint[] | null => {
  if (PARK_FIXED_ROUTES[target.name]) {
    return PARK_FIXED_ROUTES[target.name];
  }

  const startKey = findNearestGraphNode(
    start[0],
    start[1],
    PARK_GRAPH_DATA.points,
  );

  const accessPoint = PARK_ACCESS_POINTS[target.name];
  const destinationPoint: RoutePoint = accessPoint ?? [
    target.coords[0],
    target.coords[1],
  ];

  const endKey = findNearestGraphNode(
    destinationPoint[0],
    destinationPoint[1],
    PARK_GRAPH_DATA.points,
  );

  if (!startKey || !endKey) return null;

  const avoidKeys = PARK_AVOID_NODES[target.name] ?? [];
  const forcedWaypoints = PARK_FORCE_WAYPOINTS[target.name] ?? [];

  let pathKeys: string[] | null = null;

  if (forcedWaypoints.length > 0) {
    const firstLeg = dijkstraShortestPath(
      PARK_GRAPH_DATA.graph,
      startKey,
      forcedWaypoints[0],
      avoidKeys,
    );

    const secondLeg = dijkstraShortestPath(
      PARK_GRAPH_DATA.graph,
      forcedWaypoints[0],
      endKey,
      avoidKeys,
    );

    if (firstLeg && secondLeg) {
      pathKeys = [...firstLeg, ...secondLeg.slice(1)];
    }
  } else {
    pathKeys = dijkstraShortestPath(
      PARK_GRAPH_DATA.graph,
      startKey,
      endKey,
      avoidKeys,
    );
  }

  if (!pathKeys?.length) return null;

  const routePoints = pathKeys
    .map((key) => PARK_GRAPH_DATA.points.get(key))
    .filter((point): point is RoutePoint => Boolean(point));

  const finalPath: RoutePoint[] = [start, ...routePoints];

  if (!accessPoint) {
    finalPath.push([target.coords[0], target.coords[1]]);
  }

  return finalPath;
};

const fetchRoadRoute = async (
  start: RoutePoint,
  end: RoutePoint,
): Promise<RoutePoint[]> => {
  const url =
    `https://router.project-osrm.org/route/v1/foot/` +
    `${start[1]},${start[0]};${end[1]},${end[0]}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("roadServiceUnavailable");
  }

  const data = await response.json();
  const coordinates = data?.routes?.[0]?.geometry?.coordinates;

  if (!Array.isArray(coordinates)) {
    throw new Error("roadRouteNotFound");
  }

  return coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng] as RoutePoint,
  );
};

const generateTimeSlots = (venue: ExtendedVenue) => {
  const start = venue.openRange?.start ?? "09:00";
  const end = venue.openRange?.end ?? "17:00";
  const slotMinutes = venue.slotMinutes ?? 60;

  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const toLabel = (value: number) => {
    const hours = Math.floor(value / 60)
      .toString()
      .padStart(2, "0");
    const minutes = (value % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const slots: string[] = [];
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  for (
    let current = startMinutes;
    current + slotMinutes <= endMinutes;
    current += slotMinutes
  ) {
    slots.push(toLabel(current));
  }

  return slots;
};

function FitRouteBounds({ route }: { route: RoutePoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (route.length < 2) return;

    const bounds = L.latLngBounds(
      route.map(([lat, lng]) => L.latLng(lat, lng)),
    );

    map.fitBounds(bounds, {
      padding: [50, 50],
    });
  }, [map, route]);

  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const refreshMapSize = () => {
      window.requestAnimationFrame(() => {
        map.invalidateSize(false);
      });
    };

    refreshMapSize();

    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(refreshMapSize);
    resizeObserver.observe(container);

    window.addEventListener("resize", refreshMapSize);
    window.addEventListener("orientationchange", refreshMapSize);

    const delayedRefresh = window.setTimeout(refreshMapSize, 250);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", refreshMapSize);
      window.removeEventListener("orientationchange", refreshMapSize);
      window.clearTimeout(delayedRefresh);
    };
  }, [map]);

  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => {
      onMapClick();
    },
  });

  return null;
}

export default function MapPage() {
  const { t, lang } = useTranslation();
  const noBusText = t("noBus");
  const busArrivalText = (minutes: number) =>
    `${t("busArrivalPrefix")} ${minutes} ${t("busArrivalSuffix")}`;

  const getVenueName = (venue: ExtendedVenue) =>
    VENUE_NAME_TRANSLATIONS[venue.name]?.[lang] ?? venue.name;

  const getAmenityLabel = (key: string, fallback: string) => {
  const amenityKey = `amenity_${key}` as Parameters<typeof t>[0];

  return t(amenityKey) || fallback;
  };

  const [databaseAttractions, setDatabaseAttractions] = useState<
    ExtendedVenue[]
  >([]);
  const [vipItineraryTitles, setVipItineraryTitles] = useState<string[]>([]);
  const [currentFilter, setCurrentFilter] = useState<VenueFilter>("all");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState<ExtendedVenue | null>(null);
  const [realtimeBusMinutes, setRealtimeBusMinutes] = useState<number | null>(
    null,
  );
  const [weather, setWeather] = useState<{
    temp: number;
    desc: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<"info" | "select" | "success">(
    "info",
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<RoutePoint>(ENTRY_COORDS);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  const venues = useMemo(
    () => [...(VENUE_DATA as ExtendedVenue[]), ...databaseAttractions],
    [databaseAttractions],
  );
  const routeArrows = useMemo(() => {
    if (route.length < 2) return [];

    const segments: {
      start: RoutePoint;
      end: RoutePoint;
      distance: number;
      accumulatedStart: number;
    }[] = [];

    let totalDistance = 0;

    for (let index = 0; index < route.length - 1; index += 1) {
      const start = route[index];
      const end = route[index + 1];

      const distance = L.latLng(start[0], start[1]).distanceTo(
        L.latLng(end[0], end[1]),
      );

      segments.push({
        start,
        end,
        distance,
        accumulatedStart: totalDistance,
      });

      totalDistance += distance;
    }

    if (totalDistance === 0) return [];

    const footprintSpacing = 90;

    const arrowCount = Math.max(
      2,
      Math.min(8, Math.floor(totalDistance / footprintSpacing)),
    );

    const arrows: {
      position: RoutePoint;
      bearing: number;
    }[] = [];

    for (let arrowIndex = 1; arrowIndex <= arrowCount; arrowIndex += 1) {
      const targetDistance = (totalDistance * arrowIndex) / (arrowCount + 1);

      const segment = segments.find(
        (item) =>
          targetDistance >= item.accumulatedStart &&
          targetDistance <= item.accumulatedStart + item.distance,
      );

      if (!segment || segment.distance === 0) continue;

      const progress =
        (targetDistance - segment.accumulatedStart) / segment.distance;

      const lat =
        segment.start[0] + (segment.end[0] - segment.start[0]) * progress;

      const lng =
        segment.start[1] + (segment.end[1] - segment.start[1]) * progress;

      arrows.push({
        position: [lat, lng],
        bearing: calculateRouteBearing(segment.start, segment.end),
      });
    }

    return arrows;
  }, [route]);
  const filteredVenues = useMemo(() => {
    if (currentFilter === "all") {
      return venues;
    }

    if (currentFilter === "vip") {
      return venues
        .filter((venue) =>
          vipItineraryTitles.some(
            (title) =>
              title === venue.name ||
              title.includes(venue.name) ||
              venue.name.includes(title),
          ),
        )
        .map((venue) => ({
          ...venue,
          type: "vip" as const,
        }));
    }

    return venues.filter((venue) => venue.type === currentFilter);
  }, [currentFilter, venues, vipItineraryTitles]);

  useEffect(() => {
    try {
      const storedTitles = localStorage.getItem("vip-itinerary-titles");

      if (!storedTitles) {
        setVipItineraryTitles([]);
        return;
      }

      const parsedTitles = JSON.parse(storedTitles);

      setVipItineraryTitles(
        Array.isArray(parsedTitles)
          ? parsedTitles.filter(
              (title): title is string => typeof title === "string",
            )
          : [],
      );
    } catch {
      setVipItineraryTitles([]);
    }
  }, []);
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      try {
        const data = await fetchWeather(24.702, 121.8195);

        setWeather({
          temp: Math.round(data.main.temp),
          desc: data.weather[0].description,
        });

        setError(null);
      } catch {
        setError(t("weatherError"));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadAttractions = async () => {
      try {
        const data = await getAttractions();

        const convertedAttractions: ExtendedVenue[] = data
          .filter((item) => {
            const distance = L.latLng(
              PARK_CENTER[0],
              PARK_CENTER[1],
            ).distanceTo(L.latLng(item.latitude, item.longitude));

            return distance > PARK_RADIUS;
          })
          .map((item): ExtendedVenue => {
            let icon = "📍";

            if (item.category.includes("餐飲")) {
              icon = "📌";
            } else if (
              item.category.includes("戶外") ||
              item.category.includes("農場") ||
              item.category.includes("園區")
            ) {
              icon = "🌳";
            } else if (
              item.category.includes("室內") ||
              item.category.includes("文化")
            ) {
              icon = "🏛️";
            }

            return {
              name: item.place_name,
              coords: [item.latitude, item.longitude],
              icon,
              type: "surround",
              time: item.category,
              book: false,
              tags: [item.category],
              amenities: [],
            };
          });

        setDatabaseAttractions(convertedAttractions);

        console.log("資料庫景點已加入周邊：", convertedAttractions);
      } catch (attractionError) {
        console.error("取得資料庫景點失敗：", attractionError);

        setDatabaseAttractions([]);
      }
    };

    loadAttractions();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setUserLocation(ENTRY_COORDS);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const selectedTimetable = selected?.isBus
    ? selected.busDirection === 0
      ? DAZHONG_NORTH_GO_TIMES
      : DAZHONG_NORTH_RETURN_TIMES
    : null;
  useEffect(() => {
    if (!selected?.isBus) {
      setRealtimeBusMinutes(null);
      return;
    }

    const loadRealtimeBus = async () => {
      try {
        const apiBase =
          import.meta.env.VITE_PROXY_API?.replace(/\/$/, "") ?? "";

        const response = await fetch(`${apiBase}/api/bus-times`);

        if (!response.ok) {
          throw new Error(`公車 API 錯誤：${response.status}`);
        }

        const data = await response.json();

        const realtimeBus = Array.isArray(data)
          ? data.find(
              (item) =>
                item?.StopName?.Zh_tw?.includes("大眾北路") &&
                item?.Direction === selected.busDirection &&
                typeof item?.EstimateTime === "number" &&
                item.EstimateTime >= 0,
            )
          : null;

        if (realtimeBus) {
          setRealtimeBusMinutes(
            Math.max(1, Math.ceil(realtimeBus.EstimateTime / 60)),
          );
        } else {
          setRealtimeBusMinutes(null);
        }
      } catch (error) {
        console.error("取得即時公車資料失敗：", error);
        setRealtimeBusMinutes(null);
      }
    };

    loadRealtimeBus();
  }, [selected]);

  const nextBus = selectedTimetable
    ? getNextDeparture(selectedTimetable)
    : null;

  const busDisplayMinutes = realtimeBusMinutes ?? nextBus?.minutesLeft ?? null;

  const bookingSlots = selected ? generateTimeSlots(selected) : [];

  /** 開啟景點資訊卡，並清除上一條導航路線。 */
  const openVenueInfo = (venue: ExtendedVenue) => {
    setRoute([]);
    setSelected(venue);
    setBookingStep("info");
    setSelectedTime(null);
    setRouteError(null);
  };

  /** 關閉景點資訊卡並重設狀態。 */
  const closeInfoCard = () => {
    setSelected(null);
    setBookingStep("info");
    setSelectedTime(null);
    setRouteError(null);
  };

  const startNavigation = async (venue: ExtendedVenue) => {
    setRouteError(null);
    setIsRouting(true);

    try {
      const destination: RoutePoint = [venue.coords[0], venue.coords[1]];

      const isParkVenue = venue.type === "park";

      let nextRoute: RoutePoint[] | null;

      if (isParkVenue) {
        if (isInsidePark(userLocation[0], userLocation[1])) {
          nextRoute = buildParkNavigationRoute(userLocation, venue);
        } else {
          const roadToEntrance = await fetchRoadRoute(
            userLocation,
            ENTRY_COORDS,
          );

          const parkRoute = buildParkNavigationRoute(ENTRY_COORDS, venue);

          if (!parkRoute?.length) {
            throw new Error("parkRouteNotFound");
          }

          nextRoute = [...roadToEntrance, ...parkRoute.slice(1)];
        }
      } else {
        nextRoute = await fetchRoadRoute(userLocation, destination);
      }

      if (!nextRoute?.length) {
        throw new Error("routeNotFound");
      }

      setRoute(nextRoute);
      setSelected(null);
      setViewMode("map");
    } catch (routeFailure) {
      const message =
        routeFailure instanceof Error
          ? routeFailure.message
          : "routePlanningFailed";

      setRouteError(t(message as Parameters<typeof t>[0]));
    } finally {
      setIsRouting(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "white",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid #eee",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "5px",
            overflowX: "auto",
            flex: 1,
          }}
        >
          {FILTER_BUTTONS.map((button) => (
            <button
              key={button.id}
              onClick={() => setCurrentFilter(button.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                border: "none",
                backgroundColor:
                  currentFilter === button.id ? "#fbbf24" : "#f3f4f6",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {t(button.id)}
            </button>
          ))}
        </div>

        <span
          style={{
            fontSize: "14px",
            fontWeight: "bold",
            background: "#f3f4f6",
            padding: "6px 12px",
            borderRadius: "20px",
            whiteSpace: "nowrap",
          }}
        >
          {weather
            ? `${getWeatherEmoji(weather.desc)} ${weather.temp}°`
            : "..."}
        </span>

        <button
          onClick={() => setViewMode("map")}
          title={t("mapMode")}
          aria-label={t("mapMode")}
          style={{
            width: "38px",
            height: "38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            border:
              viewMode === "map"
                ? "2px solid #f59e0b"
                : "1px solid transparent",
            borderRadius: "10px",
            background: viewMode === "map" ? "#fff7ed" : "#f3f4f6",
            boxShadow:
              viewMode === "map"
                ? "0 0 0 3px rgba(245,158,11,.18), 0 3px 10px rgba(245,158,11,.28)"
                : "none",
            fontSize: viewMode === "map" ? "23px" : "19px",
            transform: viewMode === "map" ? "scale(1.08)" : "scale(1)",
            transition: "all .2s ease",
            cursor: "pointer",
          }}
        >
          📍
        </button>

        <button
          onClick={() => setViewMode("list")}
          title={t("listMode")}
          aria-label={t("listMode")}
          style={{
            width: "38px",
            height: "38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            border:
              viewMode === "list"
                ? "2px solid #f59e0b"
                : "1px solid transparent",
            borderRadius: "10px",
            background: viewMode === "list" ? "#fff7ed" : "#f3f4f6",
            boxShadow:
              viewMode === "list"
                ? "0 0 0 3px rgba(245,158,11,.18), 0 3px 10px rgba(245,158,11,.28)"
                : "none",
            fontSize: viewMode === "list" ? "23px" : "19px",
            transform: viewMode === "list" ? "scale(1.08)" : "scale(1)",
            transition: "all .2s ease",
            cursor: "pointer",
          }}
        >
          📝
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div style={{ padding: "20px" }}>{t("loading")}</div>
        ) : error ? (
          <div style={{ padding: "20px", color: "red" }}>{error}</div>
        ) : viewMode === "map" ? (
          <MapContainer
            center={[24.702, 121.8195]}
            zoom={17}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <MapResizeHandler />

            <MapClickHandler
              onMapClick={() => {
                setRoute([]);
                closeInfoCard();
              }}
            />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {filteredVenues.map((venue) => (
              <Marker
                key={`${venue.name}-${venue.coords[0]}-${venue.coords[1]}`}
                position={venue.coords}
                icon={getIcon(venue.icon)}
                zIndexOffset={9000}
                eventHandlers={{
                  click: () => openVenueInfo(venue),
                }}
              />
            ))}

            <Marker
              position={userLocation}
              icon={userIcon}
              zIndexOffset={30000}
            />

            {route.length > 1 && (
              <>
                {/* 白色底線，避免路徑被地圖背景吃掉 */}
                <Polyline
                  positions={route as LatLngExpression[]}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 7,
                    opacity: 0.2,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />

                {/* 藍色虛線導航路徑 */}
                <Polyline
                  positions={route as LatLngExpression[]}
                  pathOptions={{
                    color: "#3b82f6",
                    weight: 4,
                    opacity: 0.5,
                    dashArray: "10 10",
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />

                {/* 沿途方向箭頭 */}
                {routeArrows.map((arrow, index) => (
                  <Marker
                    key={`route-arrow-${index}`}
                    position={arrow.position}
                    icon={getRouteFootprintIcon(arrow.bearing)}
                    interactive={false}
                    keyboard={false}
                    zIndexOffset={9000}
                  />
                ))}

                <FitRouteBounds route={route} />
              </>
            )}
          </MapContainer>
        ) : (
          <div
            style={{
              padding: "10px",
              height: "100%",
              overflowY: "auto",
            }}
          >
            {filteredVenues.map((venue) => (
              <div
                key={`${venue.name}-${venue.coords[0]}-${venue.coords[1]}`}
                onClick={() => openVenueInfo(venue)}
                style={{
                  padding: "15px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                }}
              >
                {venue.icon} {getVenueName(venue)}
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "16px",
              right: "16px",
              zIndex: 9999,
              background: "rgba(255,255,255,.94)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              padding: "22px 18px",
              borderRadius: "28px",
              boxShadow: "0 8px 24px rgba(0,0,0,.16)",
            }}
          >
            <button
              onClick={closeInfoCard}
              aria-label={t("close")}
              style={{
                position: "absolute",
                top: "14px",
                right: "16px",
                width: "30px",
                height: "30px",
                border: "none",
                borderRadius: "50%",
                background: "#f3f4f6",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "18px",
                lineHeight: 1,
              }}
            >
              ×
            </button>

            {selected.isBus ? (
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  {t("busInfo")}
                </div>

                <h3
                  style={{
                    margin: 0,
                    marginBottom: "10px",
                    fontSize: "20px",
                    fontWeight: 800,
                  }}
                >
                  {selected.icon} {getVenueName(selected)}
                </h3>

                <div
                  style={{
                    marginBottom: "14px",
                    lineHeight: 1.7,
                  }}
                >
                  {busDisplayMinutes !== null ? (
                    <div>{busArrivalText(busDisplayMinutes)}</div>
                  ) : (
                    <div>{noBusText}</div>
                  )}
                </div>

                <button
                  onClick={() => startNavigation(selected)}
                  disabled={isRouting}
                  style={{
                    padding: "7px 16px",
                    border: "none",
                    borderRadius: "999px",
                    background: "#2563eb",
                    color: "white",
                    fontWeight: 700,
                    cursor: isRouting ? "wait" : "pointer",
                  }}
                >
                  {isRouting ? t("planning") : t("nav")}
                </button>
              </div>
            ) : (
              <>
                {bookingStep === "info" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "10px",
                        paddingRight: "42px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "20px",
                          fontWeight: 800,
                        }}
                      >
                        {getVenueName(selected)}
                      </h3>

                      {selected.time && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            background: "#f1f5f9",
                            padding: "4px 8px",
                            borderRadius: "999px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {selected.time}
                        </span>
                      )}
                    </div>

                    {(selected.amenities?.length ?? 0) > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          marginBottom: "10px",
                        }}
                      >
                        {selected.amenities?.map((key) => {
                          const amenity = AMENITY_ICON[key];
                          if (!amenity) return null;

                          return (
                            <span
                              key={key}
                              title={getAmenityLabel(key, amenity.label)}
                              style={{
                                width: "32px",
                                height: "32px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "8px",
                                background: "#f1f5f9",
                                fontSize: "20px",
                              }}
                            >
                              {amenity.icon}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {selected.note && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '12px'
                      }}
                    >
                      {selected.note === '牧草購買處'
                        ? t('noteGrassPurchase')
                        : selected.note}
                    </div>
                  )}

                    {routeError && (
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#dc2626",
                          marginBottom: "10px",
                        }}
                      >
                        {routeError}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      {selected.book && (
                        <button
                          onClick={() => setBookingStep("select")}
                          style={{
                            padding: "7px 16px",
                            border: "none",
                            borderRadius: "999px",
                            background: "#dcfce7",
                            color: "#166534",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {t("book")}
                        </button>
                      )}

                      <button
                        onClick={() => startNavigation(selected)}
                        disabled={isRouting}
                        style={{
                          padding: "7px 16px",
                          border: "none",
                          borderRadius: "999px",
                          background: "#2563eb",
                          color: "white",
                          fontWeight: 700,
                          cursor: isRouting ? "wait" : "pointer",
                        }}
                      >
                        {isRouting ? t("planning") : t("nav")}
                      </button>
                    </div>
                  </div>
                )}

                {bookingStep === "select" && (
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        marginBottom: "4px",
                        fontSize: "20px",
                        fontWeight: 800,
                      }}
                    >
                      {getVenueName(selected)} {t("bookingTitle")}
                    </h3>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginBottom: "12px",
                      }}
                    >
                      {t("selectTime")}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginBottom: "12px",
                      }}
                    >
                      {bookingSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          style={{
                            padding: "9px 14px",
                            border:
                              selectedTime === time
                                ? "1px solid #2563eb"
                                : "1px solid #d1d5db",
                            borderRadius: "10px",
                            background:
                              selectedTime === time ? "#2563eb" : "#fff",
                            color: selectedTime === time ? "#fff" : "#111827",
                            cursor: "pointer",
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <button
                        onClick={() => setBookingStep("info")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          border: "none",
                          borderRadius: "10px",
                          background: "#f3f4f6",
                          cursor: "pointer",
                        }}
                      >
                        {t("back")}
                      </button>

                      <button
                        onClick={() => {
                          if (!selectedTime) return;
                          setBookingStep("success");
                        }}
                        disabled={!selectedTime}
                        style={{
                          flex: 1,
                          padding: "10px",
                          border: "none",
                          borderRadius: "10px",
                          background: selectedTime ? "#f59e0b" : "#e5e7eb",
                          color: selectedTime ? "#fff" : "#9ca3af",
                          cursor: selectedTime ? "pointer" : "not-allowed",
                          fontWeight: 700,
                        }}
                      >
                        {t("submitBooking")}
                      </button>
                    </div>
                  </div>
                )}

                {bookingStep === "success" && (
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        marginBottom: "10px",
                        fontSize: "20px",
                        fontWeight: 800,
                      }}
                    >
                      {t("bookingSuccess")}
                    </h3>

                    <p style={{ marginBottom: "12px" }}>
                      {t("bookingSuccessPrefix")}「{getVenueName(selected)}」
                      {t("bookingSuccessMiddle")} {selectedTime}{" "}
                      {t("bookingSuccessSuffix")}
                    </p>

                    <button
                      onClick={closeInfoCard}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "none",
                        borderRadius: "10px",
                        background: "#2563eb",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      {t("confirm")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
