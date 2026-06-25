import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VENUE_DATA, type Venue } from '../data/venues';
import { useTranslation } from '../hooks/useTranslation';
import { fetchWeather } from '../services/api';

const FILTER_BUTTONS = [
  { id: 'all', label: '全部' },
  { id: 'park', label: '園區設施' },
  { id: 'surround', label: '周邊' },
  { id: 'vip', label: 'VIP' }
] as const;import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VENUE_DATA, type Venue } from '../data/venues';
import { useTranslation } from '../hooks/useTranslation';
import { fetchWeather } from '../services/api';

const FILTER_BUTTONS = [
  { id: 'all', label: '全部' },
  { id: 'park', label: '園區設施' },
  { id: 'surround', label: '周邊' },
  { id: 'vip', label: 'VIP' }
] as const;

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
        html: `<div style="font-size: 48px; width: 60px; height: 60px; transform: scale(0.5); transform-origin: top left; display: flex; align-items: center; justify-content: center;">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    );
  }
  return iconCache.get(emoji)!;
};

const DAZHONG_NORTH_GO_TIMES = ['09:10', '11:00', '14:20', '16:40'];
const DAZHONG_NORTH_RETURN_TIMES = ['09:30', '11:20', '14:40', '17:00'];

const getNextDeparture = (times: string[]) => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const firstTime = times[0];
  const lastTime = times[times.length - 1];

  if (!firstTime || !lastTime) return null;

  const [firstH, firstM] = firstTime.split(':').map(Number);
  const [lastH, lastM] = lastTime.split(':').map(Number);

  const firstMinutes = firstH * 60 + firstM;
  const lastMinutes = lastH * 60 + lastM;

  if (nowMinutes < firstMinutes || nowMinutes > lastMinutes) {
    return null;
  }

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

export default function MapPage() {
  const { t } = useTranslation();
  const [currentFilter, setCurrentFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<Venue | null>(null);
  const [weather, setWeather] = useState<{ temp: number; desc: string; tempMax: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<'info' | 'select' | 'success'>('info');

  const filteredVenues = useMemo(() => {
    return currentFilter === 'all'
      ? VENUE_DATA
      : VENUE_DATA.filter((v: Venue) => v.type === currentFilter);
  }, [currentFilter]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchWeather(24.7020, 121.8195);
        setWeather({
          temp: Math.round(data.main.temp),
          desc: data.weather[0].description,
          tempMax: Math.round(data.main.temp_max)
        });
        setError(null);
      } catch (e) {
        setError('無法取得天氣資料');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const selectedTimetable =
    selected?.isBus
      ? selected.busDirection === 0
        ? DAZHONG_NORTH_GO_TIMES
        : DAZHONG_NORTH_RETURN_TIMES
      : null;

  const nextBus = selectedTimetable ? getNextDeparture(selectedTimetable) : null;

  return (
    <div
      style={{
        width: '100%',        // 改用 100vw (螢幕寬度)
        height: '100%',       // 關鍵修改：改成 100vh
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        overflow: 'hidden'     // 加上這行避免產生捲軸
      }}
    >
    
      <div
        style={{
          padding: '10px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',// 讓左右元素排版好看一點
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', flex: 1 }}>
          {FILTER_BUTTONS.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setCurrentFilter(btn.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: currentFilter === btn.id ? '#fbbf24' : '#f3f4f6',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {t(btn.id as any)}
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
          {weather ? `${getWeatherEmoji(weather.desc)} ${weather.temp}° / ${weather.tempMax}°` : '...'}
        </span>

        <button
          onClick={() => setViewMode('map')}
          style={{
            padding: '5px 5px',
            background: viewMode === 'map' ? '#eee' : '#fff',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          🗺️
        </button>

        <button
          onClick={() => setViewMode('list')}
          style={{
            padding: '5px 5px',
            background: viewMode === 'list' ? '#eee' : '#fff',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          📋
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', marginTop: '0px' }}>
        {isLoading ? (
          <div style={{ padding: '20px' }}>資料載入中...</div>
        ) : error ? (
          <div style={{ padding: '20px', color: 'red' }}>{error}</div>
        ) : viewMode === 'map' ? (
          <MapContainer
            center={[24.7020, 121.8195]}
            zoom={17}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filteredVenues.map((v) => (
              <Marker
                key={`${v.name}-${v.coords[0]}-${v.coords[1]}`}
                position={v.coords}
                icon={getIcon(v.icon)}
                eventHandlers={{
                  click: () => {
                    setSelected(v);
                    setBookingStep('info');
                  }
                }}
              />
            ))}
          </MapContainer>
        ) : (
          <div style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
            {filteredVenues.map((v) => (
              <div
                key={`${v.name}-${v.coords[0]}-${v.coords[1]}`}
                onClick={() => {
                  setSelected(v);
                  setBookingStep('info');
                }}
                style={{
                  padding: '15px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer'
                }}
              >
                {v.icon} {v.name}
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              right: '20px',
              zIndex: 9999,
              background: 'white',
              padding: '20px',
              borderRadius: '20px',
              boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
            }}
          >
            {selected.isBus ? (
            <div>
                <h3 style={{ margin: 0, marginBottom: '10px' }}>
                {selected.icon} {selected.name}
                </h3>

                <div style={{ marginBottom: '12px', lineHeight: 1.8 }}>
                {nextBus ? (
                    <>
                    <div>⏱️ 預估到站：{nextBus.minutesLeft} 分鐘後</div>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '6px' }}>
                        今日班次：{selectedTimetable?.join('、')}
                    </div>
                    </>
                ) : (
                    <div>今日末班車已駛離</div>
                )}
                </div>

                <button
                onClick={() => setSelected(null)}
                style={{ width: '100%', padding: '10px' }}
                >
                關閉
                </button>
            </div>
            ) : (
              <>
                {bookingStep === 'info' && (
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '10px' }}>
                      {selected.icon} {selected.name}
                    </h3>

                    <div style={{ marginBottom: '12px', lineHeight: 1.6 }}>
                      <div>開放時間：{selected.time}</div>
                      {selected.note && <div>備註：{selected.note}</div>}
                    </div>

                    {selected.book && (
                      <button
                        onClick={() => setBookingStep('select')}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: '#fbbf24',
                          borderRadius: '10px',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        立即預約
                      </button>
                    )}

                    <button
                      onClick={() => setSelected(null)}
                      style={{ width: '100%', marginTop: '8px', padding: '10px', cursor: 'pointer' }}
                    >
                      關閉
                    </button>
                  </div>
                )}

                {bookingStep === 'select' && (
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '10px' }}>選擇時間</h3>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '5px',
                        marginBottom: '10px'
                      }}
                    >
                      {['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((time) => (
                        <button
                          key={time}
                          onClick={() => setBookingStep('success')}
                          style={{
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            background: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setBookingStep('info')}
                      style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
                    >
                      返回
                    </button>
                  </div>
                )}

                {bookingStep === 'success' && (
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '10px' }}>預約成功</h3>
                    <p style={{ marginBottom: '12px' }}>您的預約已完成。</p>

                    <button
                      onClick={() => setSelected(null)}
                      style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
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
        html: `<div style="font-size: 48px; width: 60px; height: 60px; transform: scale(0.5); transform-origin: top left; display: flex; align-items: center; justify-content: center;">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    );
  }
  return iconCache.get(emoji)!;
};

const DAZHONG_NORTH_GO_TIMES = ['09:10', '11:00', '14:20', '16:40'];
const DAZHONG_NORTH_RETURN_TIMES = ['09:30', '11:20', '14:40', '17:00'];

const getNextDeparture = (times: string[]) => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const firstTime = times[0];
  const lastTime = times[times.length - 1];

  if (!firstTime || !lastTime) return null;

  const [firstH, firstM] = firstTime.split(':').map(Number);
  const [lastH, lastM] = lastTime.split(':').map(Number);

  const firstMinutes = firstH * 60 + firstM;
  const lastMinutes = lastH * 60 + lastM;

  if (nowMinutes < firstMinutes || nowMinutes > lastMinutes) {
    return null;
  }

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

export default function MapPage() {
  const { t } = useTranslation();
  const [currentFilter, setCurrentFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<Venue | null>(null);
  const [weather, setWeather] = useState<{ temp: number; desc: string; tempMax: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<'info' | 'select' | 'success'>('info');

  const filteredVenues = useMemo(() => {
    return currentFilter === 'all'
      ? VENUE_DATA
      : VENUE_DATA.filter((v: Venue) => v.type === currentFilter);
  }, [currentFilter]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchWeather(24.7020, 121.8195);
        setWeather({
          temp: Math.round(data.main.temp),
          desc: data.weather[0].description,
          tempMax: Math.round(data.main.temp_max)
        });
        setError(null);
      } catch (e) {
        setError('無法取得天氣資料');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const selectedTimetable =
    selected?.isBus
      ? selected.busDirection === 0
        ? DAZHONG_NORTH_GO_TIMES
        : DAZHONG_NORTH_RETURN_TIMES
      : null;

  const nextBus = selectedTimetable ? getNextDeparture(selectedTimetable) : null;

  return (
    <div
      style={{
        width: '100vw',        // 改用 100vw (螢幕寬度)
        height: '100vh',       // 關鍵修改：改成 100vh
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        overflow: 'hidden'     // 加上這行避免產生捲軸
      }}
    >
    
      <div
        style={{
          padding: '10px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', flex: 1 }}>
          {FILTER_BUTTONS.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setCurrentFilter(btn.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: currentFilter === btn.id ? '#fbbf24' : '#f3f4f6',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {t(btn.id as any)}
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
          {weather ? `${getWeatherEmoji(weather.desc)} ${weather.temp}° / ${weather.tempMax}°` : '...'}
        </span>

        <button
          onClick={() => setViewMode('map')}
          style={{
            padding: '5px 5px',
            background: viewMode === 'map' ? '#eee' : '#fff',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          🗺️
        </button>

        <button
          onClick={() => setViewMode('list')}
          style={{
            padding: '5px 5px',
            background: viewMode === 'list' ? '#eee' : '#fff',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          📋
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', marginTop: '0px' }}>
        {isLoading ? (
          <div style={{ padding: '20px' }}>資料載入中...</div>
        ) : error ? (
          <div style={{ padding: '20px', color: 'red' }}>{error}</div>
        ) : viewMode === 'map' ? (
          <MapContainer
            center={[24.7020, 121.8195]}
            zoom={17}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filteredVenues.map((v) => (
              <Marker
                key={`${v.name}-${v.coords[0]}-${v.coords[1]}`}
                position={v.coords}
                icon={getIcon(v.icon)}
                eventHandlers={{
                  click: () => {
                    setSelected(v);
                    setBookingStep('info');
                  }
                }}
              />
            ))}
          </MapContainer>
        ) : (
          <div style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
            {filteredVenues.map((v) => (
              <div
                key={`${v.name}-${v.coords[0]}-${v.coords[1]}`}
                onClick={() => {
                  setSelected(v);
                  setBookingStep('info');
                }}
                style={{
                  padding: '15px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer'
                }}
              >
                {v.icon} {v.name}
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              right: '20px',
              zIndex: 9999,
              background: 'white',
              padding: '20px',
              borderRadius: '20px',
              boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
            }}
          >
            {selected.isBus ? (
            <div>
                <h3 style={{ margin: 0, marginBottom: '10px' }}>
                {selected.icon} {selected.name}
                </h3>

                <div style={{ marginBottom: '12px', lineHeight: 1.8 }}>
                {nextBus ? (
                    <>
                    <div>⏱️ 預估到站：{nextBus.minutesLeft} 分鐘後</div>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '6px' }}>
                        今日班次：{selectedTimetable?.join('、')}
                    </div>
                    </>
                ) : (
                    <div>今日末班車已駛離</div>
                )}
                </div>

                <button
                onClick={() => setSelected(null)}
                style={{ width: '100%', padding: '10px' }}
                >
                關閉
                </button>
            </div>
            ) : (
              <>
                {bookingStep === 'info' && (
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '10px' }}>
                      {selected.icon} {selected.name}
                    </h3>

                    <div style={{ marginBottom: '12px', lineHeight: 1.6 }}>
                      <div>開放時間：{selected.time}</div>
                      {selected.note && <div>備註：{selected.note}</div>}
                    </div>

                    {selected.book && (
                      <button
                        onClick={() => setBookingStep('select')}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: '#fbbf24',
                          borderRadius: '10px',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        立即預約
                      </button>
                    )}

                    <button
                      onClick={() => setSelected(null)}
                      style={{ width: '100%', marginTop: '8px', padding: '10px', cursor: 'pointer' }}
                    >
                      關閉
                    </button>
                  </div>
                )}

                {bookingStep === 'select' && (
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '10px' }}>選擇時間</h3>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '5px',
                        marginBottom: '10px'
                      }}
                    >
                      {['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((time) => (
                        <button
                          key={time}
                          onClick={() => setBookingStep('success')}
                          style={{
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            background: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setBookingStep('info')}
                      style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
                    >
                      返回
                    </button>
                  </div>
                )}

                {bookingStep === 'success' && (
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '10px' }}>預約成功</h3>
                    <p style={{ marginBottom: '12px' }}>您的預約已完成。</p>

                    <button
                      onClick={() => setSelected(null)}
                      style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
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