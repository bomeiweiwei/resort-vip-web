import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

// 1. 將對照表升級為中英雙語結構，並對齊你所有的頁面名稱
const pageTitles: Record<string, { zh: string; en: string }> = {
  "/assistant": { zh: "智能幫手", en: "Assistant" },
  "/itinerary": { zh: "行程推薦", en: "Itinerary" },
  "/guide": {     zh: "專屬導遊", en: "AI Guide" },
  "/map": {       zh: "景點地圖", en: "Map" },
};

function MainLayout() {
  const location = useLocation();
  
  // 2. 在父元件宣告語系狀態，預設為中文 "zh"
  const [currentLang, setCurrentLang] = useState<"zh" | "en">("zh");

  // 3. 自動根據路徑與語系抓出正確的標題字串
  const titleObj = pageTitles[location.pathname] ?? { zh: "RESORT VIP", en: "RESORT VIP" };
  const currentTitle = titleObj[currentLang];

  const isFullContentPage =
    location.pathname === "/guide/loading" ||
    location.pathname === "/guide/result";

  return (
    <div className="app-shell">
      {/* 4. 將當前語系傳給 Sidebar */}
      <Sidebar currentLang={currentLang} />

      <main className="main-panel">
        {/* 5. 將標題、當前語系及變更語系的 function 傳給 Header */}
        <Header 
          title={currentTitle} 
          currentLang={currentLang} 
          onLanguageChange={setCurrentLang} 
        />

        <section className="page-content">
          <Outlet context={{ currentLang }} />
        </section>
      </main>
    </div>
  );
}

export default MainLayout;