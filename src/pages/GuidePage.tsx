import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Mic, Send } from "lucide-react";
import { useNavigate, useOutletContext, useInRouterContext, HashRouter } from "react-router-dom";

// ==========================================
// 🛠️ 模擬 API 實作（防止編譯時出現 Could not resolve "../apis/guideApi" 錯誤）
// 當您本地有真實的 API 檔案時，可以直接替換為真實的 import 
// ==========================================
const analyzeGuideImageMock = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { success: true };
};

// 中英雙語翻譯字典
const translations = {
  title: {
    zh: "AI 專屬語音導遊",
    en: "AI Private Voice Guide",
  },
  desc: {
    zh: "拍下園區內任何景點、藝術品或植物，系統將自動為您進行語音導覽，並可深入互動問答。",
    en: "Take a photo of any attraction, artwork, or plant in the resort. The system will automatically provide an audio guide and interactive Q&A.",
  },
  uploadBtn: {
    zh: "拍照 / 上傳圖片",
    en: "Take Photo / Upload Image",
  },
  placeholder: {
    zh: "輸入景點/設施：讓我們為您解說",
    en: "Enter the attraction/facility: Let us explain it to you.",
  }
};

// 🎯 內部核心導覽頁面組件
function GuidePageInternal() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  
  // 🎯 建立 Ref 來控制隱藏的 file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🎯 安全防護：取得全域語系狀態 (zh / en)，若無或為 null 則安全預設為 "zh"，防止獨立渲染時崩潰
  const context = useOutletContext<any>();
  const currentLang = (context && typeof context === "object" && context.currentLang === "en") ? "en" : "zh";

  // 處理點擊圖片上傳/拍照
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 當使用者拍照完成或選擇照片後觸發
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 前往載入頁面
    navigate("/guide/loading");
    try {
      await analyzeGuideImageMock();
    } catch (err) {
      console.error("Image analysis error:", err);
    }
    // 前往導覽結果頁面
    navigate("/guide/result");
  };

  // 當旅客直接在下方輸入文字並送出時，帶著問題導向結果頁
  const handleSendQuery = () => {
    const text = message.trim();
    if (!text) return;

    // 將輸入的文字當作初始問題傳遞給結果頁
    navigate("/guide/result", { state: { initialQuery: text } });
    setMessage("");
  };

  return (
    <main className="guide-page">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* 頂部相機與上傳區 */}
      <section className="guide-hero">
        <div 
          className="guide-camera-circle" 
          onClick={handleUploadClick} 
          style={{ cursor: "pointer" }}
        >
          <Camera size={56} />
        </div>

        <h1>{translations.title[currentLang]}</h1>

        <p>{translations.desc[currentLang]}</p>

        <button
          type="button"
          className="guide-upload-button"
          onClick={handleUploadClick}
        >
          <ImageIcon size={26} />
          {translations.uploadBtn[currentLang]}
        </button>
      </section>

      {/* 底部輸入框 */}
      <section className="guide-home-input-container">
        <div className="guide-chat-input-wrap">
          <input
            type="text"
            placeholder={translations.placeholder[currentLang]}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSendQuery();
              }
            }}
          />

          <button type="button" className="guide-mic-button" title="Voice Input">
            <Mic size={18} />
          </button>

          <button 
            type="button" 
            className="guide-send-button" 
            onClick={handleSendQuery}
            disabled={!message.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}

// 🎯 導出安全包裝組件，自動偵測並補充路由環境，防止 standalone 預覽時因缺少 Router Context 崩潰
function GuidePage() {
  let inRouter = false;
  try {
    inRouter = useInRouterContext();
  } catch (e) {
    inRouter = false;
  }

  if (inRouter) {
    return <GuidePageInternal />;
  }

  return (
    <HashRouter>
      <GuidePageInternal />
    </HashRouter>
  );
}

export default GuidePage;