// src/pages/MapPage.tsx
import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VENUE_DATA, type Venue } from '../data/venues';


const FILTER_BUTTONS = [
  { id: '全部', label: '全部' },
  { id: 'park', label: '園區設施' },
  { id: 'surround', label: '周邊' },
  { id: 'vip', label: 'VIP' }
] as const;

const iconCache = new Map<string, L.DivIcon>();
const getIcon = (emoji: string) => {
  if (!iconCache.has(emoji)) {
    iconCache.set(
      emoji,
      L.divIcon({
        className: '', // 故意留空，避免吃到不該吃的 CSS
        html: `<div style="
          font-size: 24px;
          width: 30px;
          height: 30px;
          line-height: 30px;
          text-align: center;
          margin: 0;
          padding: 0;
          display: block;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
        ">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15], // [15, 15] 代表 Emoji 的「正中心」對準座標
      })
    );
  }
  return iconCache.get(emoji)!;
};

export default function MapPage() {
  const [currentFilter, setCurrentFilter] = useState('全部');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<Venue | null>(null);

  const filteredVenues = useMemo(() => {
    return currentFilter === '全部'
      ? VENUE_DATA
      // 加上明確型別 (v: Venue)，消除 ts(7006) 警告
      : VENUE_DATA.filter((v: Venue) => v.type === currentFilter);
  }, [currentFilter]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
      
      {/* 頂部操作列 (RWD 處理：允許換行、按鈕區可水平滑動) */}
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* 左側篩選按鈕區 */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: '1 1 auto', whiteSpace: 'nowrap', paddingBottom: '4px' }}>
          {FILTER_BUTTONS.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setCurrentFilter(btn.id)}
              style={{
                padding: '5px 15px',
                borderRadius: '20px',
                cursor: 'pointer',
                border: '1px solid #ccc',
                flexShrink: 0,
                backgroundColor: currentFilter === btn.id ? '#065f46' : '#fff',
                color: currentFilter === btn.id ? '#fff' : '#000'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* 右側天氣與切換功能 */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
          <span>⛅ 28°/32°</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setViewMode('map')} style={{ padding: '5px 8px', background: viewMode === 'map' ? '#eee' : '#fff', cursor: 'pointer', border: 'none', borderRadius: '4px' }}>🗺️</button>
            <button onClick={() => setViewMode('list')} style={{ padding: '5px 8px', background: viewMode === 'list' ? '#eee' : '#fff', cursor: 'pointer', border: 'none', borderRadius: '4px' }}>📋</button>
          </div>
        </div>
      </div>

      {/* 內容區域：地圖或清單 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {viewMode === 'map' ? (
          <MapContainer center={[24.7020, 121.8195]} zoom={17} zoomControl={false} style={{ height: '100%', width: '100%' }}>
            <style>{`.leaflet-container { border: none !important; outline: none !important; }`}</style>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {/* 加上明確型別 (v: Venue)，消除 ts(7006) 警告 */}
            {filteredVenues.map((v: Venue) => (
              <Marker
                key={`${v.name}-${v.coords[0]}-${v.coords[1]}`}
                position={v.coords}
                icon={getIcon(v.icon)}
                eventHandlers={{ click: () => setSelected(v) }}
              />
            ))}
          </MapContainer>
        ) : (
          <div style={{ padding: '12px', height: '100%', overflowY: 'auto' }}>
            {/* 加上明確型別 (v: Venue)，消除 ts(7006) 警告 */}
            {filteredVenues.map((v: Venue) => (
              <div
                key={`${v.name}-${v.coords[0]}-${v.coords[1]}`}
                onClick={() => setSelected(v)}
                style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <span style={{ fontSize: '24px' }}>{v.icon}</span> 
                <span style={{ fontWeight: 'bold' }}>{v.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* 點擊圖釘後彈出的資訊卡 (RWD 處理：最大寬度 350px，自動置中) */}
        {selected && (
          <div style={{ 
            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', 
            width: 'calc(100% - 40px)', maxWidth: '350px', zIndex: 1000, 
            backgroundColor: 'white', padding: '20px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' 
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>{selected.name}</h3>
            <button
              onClick={() => setSelected(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}
            >
              ✕
            </button>
            <button style={{ width: '100%', padding: '12px', borderRadius: '16px', background: '#d97706', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
              前往導航
            </button>
          </div>
        )}
      </div>
    </div>
  );
}