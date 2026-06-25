import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap
} from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VENUE_DATA, type Venue } from '../data/venues';
import { useTranslation } from '../hooks/useTranslation';
import { fetchWeather } from '../services/api';

type ExtendedVenue = Venue & {
  amenities?: string[];
  openRange?: {
    start?: string;
    end?: string;
  };
  slotMinutes?: number;
  isBus?: boolean;
  busDirection?: number;
};

type RoutePoint = [number, number];

const FILTER_BUTTONS = [
  { id: 'all', label: '全部' },
  { id: 'park', label: '園區設施' },
  { id: 'surround', label: '周邊' },
  { id: 'vip', label: 'VIP' }
] as const;

const ENTRY_COORDS: RoutePoint = [24.703143, 121.820413];
const PARK_CENTER = L.latLng(24.7022, 121.8198);
const PARK_RADIUS = 300;

const DAZHONG_NORTH_GO_TIMES = ['09:10', '11:00', '14:20', '16:40'];
const DAZHONG_NORTH_RETURN_TIMES = ['09:30', '11:20', '14:40', '17:00'];

const AMENITY_ICON: Record<string, { icon: string; label: string }> = {
  parking: { icon: '🅿️', label: '停車場' },
  info: { icon: 'ℹ️', label: '服務台' },
  souvenir: { icon: '🛍️', label: '紀念品' },
  nursery: { icon: '👶', label: '哺乳室' },
  restaurant: { icon: '🍽️', label: '餐飲' },
  wifi: { icon: '📶', label: 'Wi-Fi' },
  toilet: { icon: '🚻', label: '化妝室' },
  accessibleToilet: { icon: '♿', label: '無障礙廁所' },
  firstAid: { icon: '⛑️', label: '醫護站' },
  aed: { icon: '❤️‍🔥', label: 'AED' }
};

const PARK_ROUTES: RoutePoint[][] = [
  [
    [24.702948, 121.81809],
    [24.702938, 121.818026],
    [24.703118, 121.819319]
  ],
  [
    [24.703096, 121.819209],
    [24.702916, 121.819233],
    [24.702441, 121.819319],
    [24.702258, 121.819313],
    [24.702166, 121.819337],
    [24.70201, 121.819402],
    [24.701686, 121.819324],
    [24.701374, 121.819533],
    [24.701176, 121.819675],
    [24.701442, 121.819898],
    [24.70159, 121.819689],
    [24.701634, 121.81967],
    [24.701717, 121.819686],
    [24.701744, 121.819729],
    [24.701788, 121.819823],
    [24.70188, 121.819901],
    [24.701958, 121.819906],
    [24.702097, 121.819812],
    [24.702205, 121.819799],
    [24.702619, 121.819799],
    [24.70267, 121.819799],
    [24.702789, 121.819855],
    [24.702828, 121.819871],
    [24.702877, 121.819879],
    [24.702887, 121.819882],
    [24.702906, 121.82],
    [24.702962, 121.820099],
    [24.70297, 121.820174],
    [24.703001, 121.820185],
    [24.703043, 121.820247],
    [24.703077, 121.820292],
    [24.703226, 121.820295],
    [24.703233, 121.8203],
    [24.703245, 121.8203],
    [24.703152, 121.819587]
  ],
  [
    [24.703072, 121.820394],
    [24.70307, 121.8203],
    [24.70306, 121.820287],
    [24.70297, 121.820188],
    [24.702811, 121.820193],
    [24.702772, 121.820096],
    [24.702692, 121.820059],
    [24.702621, 121.819984],
    [24.702514, 121.819973],
    [24.702317, 121.819995],
    [24.702258, 121.820051],
    [24.702229, 121.820164],
    [24.702222, 121.820255],
    [24.702214, 121.820282],
    [24.702516, 121.820271],
    [24.702629, 121.820311],
    [24.702653, 121.820308],
    [24.702641, 121.820319],
    [24.702802, 121.820209]
  ],
  [
    [24.702638, 121.820327],
    [24.70248, 121.8204],
    [24.702438, 121.820461],
    [24.702326, 121.820451],
    [24.702331, 121.820386],
    [24.702297, 121.8203]
  ],
  [
    [24.702202, 121.820284],
    [24.70211, 121.820223],
    [24.702032, 121.820086],
    [24.701954, 121.819911]
  ],
  [
    [24.701932, 121.820365],
    [24.701841, 121.820477]
  ],
  [
    [24.70188, 121.82041],
    [24.701839, 121.82037],
    [24.701749, 121.820429],
    [24.701561, 121.820512],
    [24.701483, 121.820499],
    [24.701435, 121.820453],
    [24.701376, 121.820282],
    [24.701413, 121.820054],
    [24.701415, 121.819976],
    [24.701442, 121.819911]
  ],
  [
    [24.702446, 121.819329],
    [24.702441, 121.819321],
    [24.702397, 121.819439],
    [24.702304, 121.819442],
    [24.702246, 121.819525],
    [24.702158, 121.819525],
    [24.702071, 121.819732],
    [24.702083, 121.819818]
  ],
  [
    [24.702063, 121.81971],
    [24.702083, 121.81971],
    [24.70201, 121.819598],
    [24.701997, 121.819413]
  ]
];

const PARK_ACCESS_POINTS: Record<string, RoutePoint> = {
  露營區: [24.702938, 121.818026]
};

const PARK_AVOID_NODES: Record<string, string[]> = {
  露營區: ['24.703152,121.819587']
};

const PARK_FORCE_WAYPOINTS: Record<string, string[]> = {
  露營區: ['24.703096,121.819209']
};

const PARK_FIXED_ROUTES: Record<string, RoutePoint[]> = {
  露營區: [
    [24.703143, 121.820413],
    [24.703072, 121.820394],
    [24.70307, 121.8203],
    [24.70306, 121.820287],
    [24.70297, 121.820188],
    [24.702772, 121.820096],
    [24.702692, 121.820059],
    [24.702514, 121.819973],
    [24.702317, 121.819995],
    [24.702205, 121.819799],
    [24.702083, 121.81971],
    [24.702158, 121.819525],
    [24.702304, 121.819442],
    [24.702441, 121.819319],
    [24.702916, 121.819233],
    [24.703096, 121.819209],
    [24.702938, 121.818026]
  ]
};

const getWeatherEmoji = (desc: string) => {
  const d = desc.toLowerCase();
  if (d.includes('雨') || d.includes('rain')) return '🌧️';
  if (d.includes('雲') || d.includes('cloud')) return '⛅';
  if (d.includes('晴') || d.includes('clear')) return '☀️';
  return '🌤️';
};

const iconCache = new Map<string, L.DivIcon>();

const getIcon = (emoji: string) => {
  if (!iconCache.has(emoji)) {
    iconCache.set(
      emoji,
      L.divIcon({
        className: '',
        html: `<div style="font-size:48px;width:60px;height:60px;transform:scale(.5);transform-origin:top left;display:flex;align-items:center;justify-content:center;">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    );
  }
  return iconCache.get(emoji)!;
};

const userIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:30px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">😄</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const getNextDeparture = (times: string[]) => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const time of times) {
    const [h, m] = time.split(':').map(Number);
    const target = h * 60 + m;
    if (target >= nowMinutes) {
      return {
        time,
        minutesLeft: target - nowMinutes
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
    const distance = L.latLng(a[0], a[1]).distanceTo(
      L.latLng(b[0], b[1])
    );
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
      const distance = L.latLng(a[0], a[1]).distanceTo(
        L.latLng(b[0], b[1])
      );

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
  points: Map<string, RoutePoint>
) => {
  let bestKey: string | null = null;
  let minDistance = Infinity;

  for (const [key, point] of points.entries()) {
    const distance = L.latLng(lat, lng).distanceTo(
      L.latLng(point[0], point[1])
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
  avoidKeys: string[] = []
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
  PARK_CENTER.distanceTo(L.latLng(lat, lng)) <= PARK_RADIUS;

const buildParkNavigationRoute = (
  start: RoutePoint,
  target: ExtendedVenue
): RoutePoint[] | null => {
  if (PARK_FIXED_ROUTES[target.name]) {
    return PARK_FIXED_ROUTES[target.name];
  }

  const startKey = findNearestGraphNode(
    start[0],
    start[1],
    PARK_GRAPH_DATA.points
  );

  const accessPoint = PARK_ACCESS_POINTS[target.name];
  const destinationPoint: RoutePoint = accessPoint ?? [
    target.coords[0],
    target.coords[1]
  ];

  const endKey = findNearestGraphNode(
    destinationPoint[0],
    destinationPoint[1],
    PARK_GRAPH_DATA.points
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
      avoidKeys
    );

    const secondLeg = dijkstraShortestPath(
      PARK_GRAPH_DATA.graph,
      forcedWaypoints[0],
      endKey,
      avoidKeys
    );

    if (firstLeg && secondLeg) {
      pathKeys = [...firstLeg, ...secondLeg.slice(1)];
    }
  } else {
    pathKeys = dijkstraShortestPath(
      PARK_GRAPH_DATA.graph,
      startKey,
      endKey,
      avoidKeys
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
  end: RoutePoint
): Promise<RoutePoint[]> => {
  const url =
    `https://router.project-osrm.org/route/v1/foot/` +
    `${start[1]},${start[0]};${end[1]},${end[0]}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('道路導航服務無法使用');
  }

  const data = await response.json();
  const coordinates = data?.routes?.[0]?.geometry?.coordinates;

  if (!Array.isArray(coordinates)) {
    throw new Error('找不到道路路線');
  }

  return coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng] as RoutePoint
  );
};

const generateTimeSlots = (venue: ExtendedVenue) => {
  const start = venue.openRange?.start ?? '09:00';
  const end = venue.openRange?.end ?? '17:00';
  const slotMinutes = venue.slotMinutes ?? 60;

  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const toLabel = (value: number) => {
    const hours = Math.floor(value / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (value % 60).toString().padStart(2, '0');
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
      route.map(([lat, lng]) => L.latLng(lat, lng))
    );

    map.fitBounds(bounds, {
      padding: [50, 50]
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

    window.addEventListener('resize', refreshMapSize);
    window.addEventListener('orientationchange', refreshMapSize);

    const delayedRefresh = window.setTimeout(refreshMapSize, 250);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', refreshMapSize);
      window.removeEventListener('orientationchange', refreshMapSize);
      window.clearTimeout(delayedRefresh);
    };
  }, [map]);

  return null;
}

export default function MapPage() {
  const { t } = useTranslation();

  const [currentFilter, setCurrentFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<ExtendedVenue | null>(null);
  const [weather, setWeather] = useState<{
    temp: number;
    desc: string;
    tempMax: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<
    'info' | 'select' | 'success'
  >('info');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [userLocation, setUserLocation] =
    useState<RoutePoint>(ENTRY_COORDS);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  const venues = VENUE_DATA as ExtendedVenue[];

  const filteredVenues = useMemo(() => {
    return currentFilter === 'all'
      ? venues
      : venues.filter((venue) => venue.type === currentFilter);
  }, [currentFilter, venues]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      try {
        const data = await fetchWeather(24.702, 121.8195);

        setWeather({
          temp: Math.round(data.main.temp),
          desc: data.weather[0].description,
          tempMax: Math.round(data.main.temp_max)
        });

        setError(null);
      } catch {
        setError('無法取得天氣資料');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude
        ]);
      },
      () => {
        setUserLocation(ENTRY_COORDS);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const selectedTimetable = selected?.isBus
    ? selected.busDirection === 0
      ? DAZHONG_NORTH_GO_TIMES
      : DAZHONG_NORTH_RETURN_TIMES
    : null;

  const nextBus = selectedTimetable
    ? getNextDeparture(selectedTimetable)
    : null;

  const bookingSlots = selected ? generateTimeSlots(selected) : [];

  const closeInfoCard = () => {
    setSelected(null);
    setBookingStep('info');
    setSelectedTime(null);
  };

  const startNavigation = async (venue: ExtendedVenue) => {
    setRouteError(null);
    setIsRouting(true);

    try {
      const destination: RoutePoint = [
        venue.coords[0],
        venue.coords[1]
      ];

      const isParkVenue = venue.type === 'park';

      let nextRoute: RoutePoint[] | null;

      if (isParkVenue) {
        if (isInsidePark(userLocation[0], userLocation[1])) {
          nextRoute = buildParkNavigationRoute(userLocation, venue);
        } else {
          const roadToEntrance = await fetchRoadRoute(
            userLocation,
            ENTRY_COORDS
          );

          const parkRoute = buildParkNavigationRoute(
            ENTRY_COORDS,
            venue
          );

          if (!parkRoute?.length) {
            throw new Error('找不到園區內路線');
          }

          nextRoute = [
            ...roadToEntrance,
            ...parkRoute.slice(1)
          ];
        }
      } else {
        nextRoute = await fetchRoadRoute(
          userLocation,
          destination
        );
      }

      if (!nextRoute?.length) {
        throw new Error('找不到可使用的路線');
      }

      setRoute(nextRoute);
      setSelected(null);
      setViewMode('map');
    } catch (routeFailure) {
      const message =
        routeFailure instanceof Error
          ? routeFailure.message
          : '路線規劃失敗';

      setRouteError(message);
    } finally {
      setIsRouting(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '10px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '5px',
            overflowX: 'auto',
            flex: 1
          }}
        >
          {FILTER_BUTTONS.map((button) => (
            <button
              key={button.id}
              onClick={() => setCurrentFilter(button.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor:
                  currentFilter === button.id
                    ? '#fbbf24'
                    : '#f3f4f6',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {t(button.id as any)}
            </button>
          ))}
        </div>

        <span
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            background: '#f3f4f6',
            padding: '6px 12px',
            borderRadius: '20px',
            whiteSpace: 'nowrap'
          }}
        >
          {weather
            ? `${getWeatherEmoji(weather.desc)} ${weather.temp}° / ${weather.tempMax}°`
            : '...'}
        </span>

        <button
          onClick={() => setViewMode('map')}
          style={{
            padding: '5px',
            background: viewMode === 'map' ? '#eee' : '#fff',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px'
          }}
          aria-label="地圖模式"
        >
          🗺️
        </button>

        <button
          onClick={() => setViewMode('list')}
          style={{
            padding: '5px',
            background: viewMode === 'list' ? '#eee' : '#fff',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px'
          }}
          aria-label="清單模式"
        >
          📋
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {isLoading ? (
          <div style={{ padding: '20px' }}>資料載入中...</div>
        ) : error ? (
          <div style={{ padding: '20px', color: 'red' }}>{error}</div>
        ) : viewMode === 'map' ? (
          <MapContainer
            center={[24.702, 121.8195]}
            zoom={17}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <MapResizeHandler />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {filteredVenues.map((venue) => (
              <Marker
                key={`${venue.name}-${venue.coords[0]}-${venue.coords[1]}`}
                position={venue.coords}
                icon={getIcon(venue.icon)}
                eventHandlers={{
                  click: () => {
                    setRoute([]);
                    setSelected(venue);
                    setBookingStep('info');
                    setSelectedTime(null);
                    setRouteError(null);
                  }
                }}
              />
            ))}

            <Marker
              position={userLocation}
              icon={userIcon}
              zIndexOffset={10000}
            />

            {route.length > 1 && (
              <>
                <Polyline
                  positions={route as LatLngExpression[]}
                  pathOptions={{
                    color: '#ef4444',
                    weight: 6,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
                <FitRouteBounds route={route} />
              </>
            )}
          </MapContainer>
        ) : (
          <div
            style={{
              padding: '10px',
              height: '100%',
              overflowY: 'auto'
            }}
          >
            {filteredVenues.map((venue) => (
              <div
                key={`${venue.name}-${venue.coords[0]}-${venue.coords[1]}`}
                onClick={() => {
                  setRoute([]);
                  setSelected(venue);
                  setBookingStep('info');
                  setSelectedTime(null);
                  setRouteError(null);
                }}
                style={{
                  padding: '15px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer'
                }}
              >
                {venue.icon} {venue.name}
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              zIndex: 9999,
              background: 'rgba(255,255,255,.94)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              padding: '22px 18px',
              borderRadius: '28px',
              boxShadow: '0 8px 24px rgba(0,0,0,.16)'
            }}
          >
            <button
              onClick={closeInfoCard}
              aria-label="關閉資訊框"
              style={{
                position: 'absolute',
                top: '14px',
                right: '16px',
                width: '30px',
                height: '30px',
                border: 'none',
                borderRadius: '50%',
                background: '#f3f4f6',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1
              }}
            >
              ×
            </button>

            {selected.isBus ? (
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginBottom: '4px'
                  }}
                >
                  公車資訊
                </div>

                <h3
                  style={{
                    margin: 0,
                    marginBottom: '10px',
                    fontSize: '20px',
                    fontWeight: 800
                  }}
                >
                  {selected.icon} {selected.name}
                </h3>

                <div
                  style={{
                    marginBottom: '14px',
                    lineHeight: 1.7
                  }}
                >
                  {nextBus ? (
                    <>
                      <div>
                        🚌 下一班 {nextBus.time}，約{' '}
                        {nextBus.minutesLeft} 分鐘後
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#6b7280',
                          marginTop: '4px'
                        }}
                      >
                        今日班次：{selectedTimetable?.join('、')}
                      </div>
                    </>
                  ) : (
                    <div>今日末班車已駛離</div>
                  )}
                </div>

                <button
                  onClick={() => startNavigation(selected)}
                  disabled={isRouting}
                  style={{
                    padding: '7px 16px',
                    border: 'none',
                    borderRadius: '999px',
                    background: '#2563eb',
                    color: 'white',
                    fontWeight: 700,
                    cursor: isRouting ? 'wait' : 'pointer'
                  }}
                >
                  {isRouting ? '規劃中…' : '前往'}
                </button>
              </div>
            ) : (
              <>
                {bookingStep === 'info' && (
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginBottom: '4px'
                      }}
                    >
                      {selected.time}
                    </div>

                    <h3
                      style={{
                        margin: 0,
                        marginBottom: '10px',
                        fontSize: '20px',
                        fontWeight: 800
                      }}
                    >
                      {selected.name}
                    </h3>

                    {(selected.amenities?.length ?? 0) > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginBottom: '10px'
                        }}
                      >
                        {selected.amenities?.map((key) => {
                          const amenity = AMENITY_ICON[key];
                          if (!amenity) return null;

                          return (
                            <span
                              key={key}
                              title={amenity.label}
                              style={{
                                width: '32px',
                                height: '32px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                background: '#f1f5f9',
                                fontSize: '20px'
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
                        {selected.note}
                      </div>
                    )}

                    {routeError && (
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#dc2626',
                          marginBottom: '10px'
                        }}
                      >
                        {routeError}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}
                    >
                      {selected.book && (
                        <button
                          onClick={() => setBookingStep('select')}
                          style={{
                            padding: '7px 16px',
                            border: 'none',
                            borderRadius: '999px',
                            background: '#dcfce7',
                            color: '#166534',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          預約
                        </button>
                      )}

                      <button
                        onClick={() => startNavigation(selected)}
                        disabled={isRouting}
                        style={{
                          padding: '7px 16px',
                          border: 'none',
                          borderRadius: '999px',
                          background: '#2563eb',
                          color: 'white',
                          fontWeight: 700,
                          cursor: isRouting ? 'wait' : 'pointer'
                        }}
                      >
                        {isRouting ? '規劃中…' : '前往'}
                      </button>
                    </div>
                  </div>
                )}

                {bookingStep === 'select' && (
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        marginBottom: '4px',
                        fontSize: '20px',
                        fontWeight: 800
                      }}
                    >
                      {selected.name} 預約
                    </h3>

                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginBottom: '12px'
                      }}
                    >
                      請選擇時間
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '12px'
                      }}
                    >
                      {bookingSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          style={{
                            padding: '9px 14px',
                            border:
                              selectedTime === time
                                ? '1px solid #2563eb'
                                : '1px solid #d1d5db',
                            borderRadius: '10px',
                            background:
                              selectedTime === time
                                ? '#2563eb'
                                : '#fff',
                            color:
                              selectedTime === time
                                ? '#fff'
                                : '#111827',
                            cursor: 'pointer'
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px'
                      }}
                    >
                      <button
                        onClick={() => setBookingStep('info')}
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: 'none',
                          borderRadius: '10px',
                          background: '#f3f4f6',
                          cursor: 'pointer'
                        }}
                      >
                        返回
                      </button>

                      <button
                        onClick={() => {
                          if (!selectedTime) return;
                          setBookingStep('success');
                        }}
                        disabled={!selectedTime}
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: 'none',
                          borderRadius: '10px',
                          background: selectedTime
                            ? '#f59e0b'
                            : '#e5e7eb',
                          color: selectedTime ? '#fff' : '#9ca3af',
                          cursor: selectedTime
                            ? 'pointer'
                            : 'not-allowed',
                          fontWeight: 700
                        }}
                      >
                        預約送出
                      </button>
                    </div>
                  </div>
                )}

                {bookingStep === 'success' && (
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        marginBottom: '10px',
                        fontSize: '20px',
                        fontWeight: 800
                      }}
                    >
                      預約成功
                    </h3>

                    <p style={{ marginBottom: '12px' }}>
                      已為您預約「{selected.name}」的{' '}
                      {selectedTime} 時段。
                    </p>

                    <button
                      onClick={closeInfoCard}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: 'none',
                        borderRadius: '10px',
                        background: '#2563eb',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      確定
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
