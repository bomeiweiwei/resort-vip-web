// 後端 API 位址
const API_BASE =
  import.meta.env.VITE_PROXY_API || 'http://localhost:8001';

// 取得天氣：改由 FastAPI 後端呼叫 OpenWeather
export const fetchWeather = async (lat: number, lon: number) => {
  const response = await fetch(
    `${API_BASE}/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
  );

  if (!response.ok) {
    throw new Error(`取得天氣失敗：${response.status}`);
  }

  return response.json();
};

// 取得公車動態
// 這段目前仍是前端直接呼叫 TDX，之後再移到後端處理
export const fetchBusArrival = async (route: string) => {
  const token = sessionStorage.getItem('tdx_token');

  const response = await fetch(
    `https://tdx.transportdata.tw/api/basic/v2/Bus/EstimatedTimeOfArrival/City/YilanCounty/${encodeURIComponent(route)}?$format=JSON`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`取得公車資訊失敗：${response.status}`);
  }

  return response.json();
};