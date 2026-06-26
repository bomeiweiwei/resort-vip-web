import { useEffect } from "react";
import { Globe, Bot } from "lucide-react";
import type { CustomerProfile } from "../types/auth"; // 請確認此路徑與你的專案架構相符

// 定義接收的 Props 結構
type HeaderProps = {
  title: string;
  currentLang: "zh" | "en";
  onLanguageChange: (lang: "zh" | "en") => void;
};

function Header({ title, currentLang, onLanguageChange }: HeaderProps) {
  
  // 新增 useEffect：在元件初次載入時讀取 localStorage 並設定預設語系
  useEffect(() => {
    const profileText = localStorage.getItem("customer_profile");

    if (profileText) {
      try {
        const customerProfile = JSON.parse(profileText) as CustomerProfile;
        
        // 判斷國碼：若為 "TW" 則預設中文，其餘皆預設英文
        const defaultLang = customerProfile.country_code === "TW" ? "zh" : "en";
        
        // 通知父元件更新語系
        onLanguageChange(defaultLang);
      } catch (error) {
        console.error("解析 customer_profile 失敗:", error);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空陣列確保只在畫面第一次掛載時執行

  const handleLanguageChange = () => {
    // 點擊時通知父元件切換語系
    const nextLang = currentLang === "zh" ? "en" : "zh";
    onLanguageChange(nextLang);
  };

  return (
    <header className="top-header">
      <div className="header-title-container">
        <div className="header-icon-wrapper">
          <Bot size={24} />
        </div>
        
        <div>
          <h1>{title}</h1>
          <span className="mobile-header-subtitle">
            RESORT VIP
          </span>
        </div>
      </div>

      <div className="header-actions">
        <button onClick={handleLanguageChange} className="lang-switch-button">
          <Globe size={18} />
          {/* 按鈕顯示即時對應的文字 */}
          <span>{currentLang === "zh" ? "繁中" : "EN"}</span>
        </button>
      </div>
    </header>
  );
}

export default Header;