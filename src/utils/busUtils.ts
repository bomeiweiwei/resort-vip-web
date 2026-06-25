// src/utils/busUtils.ts

// 這裡直接定義你的時刻表資料
export const DAZHONG_NORTH_GO_TIMES = ["07:10", "12:30", "16:40", "18:20"];
export const DAZHONG_NORTH_RETURN_TIMES = ["07:25", "12:45", "16:55", "18:35"];

// 計算邏輯
export const getNextDeparture = (timetable: string[]) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  for (const time of timetable) {
    const [h, m] = time.split(':').map(Number);
    const departureMinutes = h * 60 + m;
    
    if (departureMinutes >= currentMinutes) {
      return { 
        time, 
        diff: departureMinutes - currentMinutes 
      };
    }
  }
  return null; // 今日已無班次
};