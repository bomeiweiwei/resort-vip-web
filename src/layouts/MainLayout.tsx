import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

// 1. 將對照表升級為中英雙語結構，並對齊你所有的頁面名稱[cite: 11]
const pageTitles: Record<string, { zh: string; en: string }> = {
  "/assistant": { zh: "禮賓管家", en: "Smart Butler" },
  "/itinerary": { zh: "尊榮行程", en: " VIP Journey" },
  "/guide": {     zh: "專屬導遊", en: "Pocket AI Guide" },
  "/loading": {   zh: "專屬導遊", en: "Pocket AI Guide" },
  "/result": {    zh: "專屬導遊", en: "Pocket AI Guide" },
  "/map": {       zh: "全域領航", en: "Resort-Wide Pilot" },
  "/google-map": {zh: "全域領航", en: "Resort-Wide Pilot" },
};

function MainLayout() {
  const location = useLocation(); //[cite: 11]
  const shellRef = useRef<HTMLDivElement | null>(null); // 🎯 建立鎖定最外層容器的指標
  
  // 2. 在父元件宣告語系狀態，預設為中文 "zh"[cite: 11]
  const [currentLang, setCurrentLang] = useState<"zh" | "en">("zh"); //[cite: 11]

  // 3. 自動根據路徑與語系抓出正確的標題字串[cite: 11]
  const titleObj = pageTitles[location.pathname] ?? { zh: "專屬導遊", en: "Pocket AI Guide" }; //[cite: 11]
  const currentTitle = titleObj[currentLang]; //[cite: 11]

  // 🎯 核心防禦：全域多瀏覽器內核全螢幕請求處理
  const triggerFullscreen = () => {
    const element = shellRef.current;
    if (!element) return;

    // 依據主流瀏覽器內核規範，進行全面的全螢幕方法相容呼叫
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(() => {});
    } else if ((element as any).webkitRequestFullscreen) { /* iOS Safari / Android Chrome 旧内核 */
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {    /* Firefox */
      (element as any).mozRequestFullScreen();
    } else if ((element as any).msRequestFullscreen) {     /* IE11 / Edge */
      (element as any).msRequestFullscreen();
    }
  };

  // 🎯 核心監聽：登入完成後，只要房客首次在網頁進行點擊 (Click) 或 觸控 (Touch)，立即啟動全螢幕隱藏網址列
  useEffect(() => {
    const handleUserInteraction = () => {
      triggerFullscreen();
      // 安全卸載：只要成功觸發一次互動解鎖，立即移除監聽器防止干擾房客正常的點擊元件操作
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction);

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [location.pathname]); // 🚀 每次切換功能頁面時，同步重新布署防禦偵測[cite: 11]

  return (
    // 🎯 4. 將 ref 綁定至最外層的 app-shell，使其成為全螢幕視窗主體[cite: 11]
    <div ref={shellRef} className="app-shell">
      {/* 将当前语系传给 Sidebar[cite: 11] */}
      <Sidebar currentLang={currentLang} /> {/*[cite: 11] */}

      <main className="main-panel"> {/*[cite: 11] */}
        {/* 将标题、当前语系及变更语系的 function 传给 Header[cite: 11] */}
        <Header 
          title={currentTitle} 
          currentLang={currentLang} 
          onLanguageChange={setCurrentLang} 
        /> {/*[cite: 11] */}

        <section className="page-content"> {/*[cite: 11] */}
          <Outlet context={{ currentLang }} /> {/*[cite: 11] */}
        </section> {/*[cite: 11] */}
      </main> {/*[cite: 11] */}
    </div>
  );
}

export default MainLayout;