// 👈 新增：TDX 與天氣的請求服務
const TDX_BASE = 'https://tdx.transportdata.tw/api/basic/v2';
const WEATHER_BASE = 'https://api.openweathermap.org/data/2.5';

// 取得天氣 (請記得使用環境變數存放 API Key)
export const fetchWeather = async (lat: number, lon: number) => {
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY; // 👈 確保你有在 .env 設定此變數
  const response = await fetch(`${WEATHER_BASE}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
  return response.json();
};

// 取得公車動態 (TDX 需要 Token 認證)
export const fetchBusArrival = async (route: string) => {
  // 這裡假設你已經有取得 Token 的流程
  const response = await fetch(`${TDX_BASE}/Bus/EstimatedTimeOfArrival/City/YilanCounty/${route}?$format=JSON`, {
    headers: { 'Authorization': `Bearer ${sessionStorage.getItem('tdx_token')}` }
  });
  return response.json();
};