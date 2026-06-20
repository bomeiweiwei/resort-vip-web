import { Globe, Bot } from "lucide-react";

// 定義接收的 Props 結構
type HeaderProps = {
  title: string;
  currentLang: "zh" | "en";
  onLanguageChange: (lang: "zh" | "en") => void;
};

function Header({ title, currentLang, onLanguageChange }: HeaderProps) {
  
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