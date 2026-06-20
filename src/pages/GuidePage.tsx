import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Mic, Send } from "lucide-react";
import { useNavigate, useOutletContext, useInRouterContext, HashRouter } from "react-router-dom";

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

function GuidePageInternal() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 取得全域語系狀態 (zh / en)，若無則安全預設為 "zh"
  const context = useOutletContext<any>();
  const currentLang = (context && typeof context === "object" && context.currentLang === "en") ? "en" : "zh";

  // 處理點擊圖片上傳/拍照
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 當使用者拍照完成或選擇照片後觸發
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 🎯 拍照後將實體 File 物件當作 Router state 傳遞給 LoadingPage 進行 API 上傳
    navigate("/guide/loading", { state: { imageFile: file } });
  };

  // 當旅客直接在下方輸入文字並送出時，帶著初始問題導向結果頁
  const handleSendQuery = () => {
    const text = message.trim();
    if (!text) return;

    // 將輸入的文字當作初始問題傳遞給結果頁
    navigate("/guide/result", { state: { initialQuery: text } });
    setMessage("");
  };

  return (
    // 🎯 核心修正：覆蓋 CSS 樣式，鎖定視窗高度、禁止滾動，完美固定畫面
    <main 
      className="guide-page" 
      style={{
        height: "calc(100dvh - 120px)", // 扣除頂部 Header 與底部 Tab Bar 的約略高度
        minHeight: "auto",
        padding: "16px 16px 24px 16px", // 移除過多的底部 padding
        overflow: "hidden", // 🚫 禁止上下滑動
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* 隱藏的實體檔案上傳輸入框：capture="environment" 會在行動裝置上強制開啟後置相機 */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* 頂部相機與上傳區 */}
      {/* 🎯 設定 flex: 1 讓它自動佔滿上方空間，並將內容完美垂直置中 */}
      <section 
        className="guide-hero" 
        style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          justifyContent: "center", 
          alignItems: "center",
          marginTop: 0,
          marginBottom: 0
        }}
      >
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
      {/* 🎯 取消 margin-top: auto，因為上方已經有 flex: 1 把它往下推了 */}
      <section 
        className="guide-home-input-container"
        style={{ marginTop: 0, paddingBottom: 0 }}
      >
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