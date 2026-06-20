import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Mic, Send, Square } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";

const translations = {
  title: { zh: "AI 專屬語音導遊", en: "AI Private Voice Guide" },
  desc: {
    zh: "拍下園區內任何景點、藝術品或植物，系統將自動為您進行語音導覽，並可深入互動問答。",
    en: "Take a photo of any attraction, artwork, or plant in the resort. The system will automatically provide an audio guide and interactive Q&A.",
  },
  uploadBtn: { zh: "拍照 / 上傳圖片", en: "Take Photo / Upload Image" },
  placeholder: {
    zh: "輸入景點/設施：讓我們為您解說",
    en: "Enter the attraction/facility: Let us explain it to you.",
  },
  voiceError: { zh: "無法存取麥克風設備，請確認權限。", en: "Unable to access microphone. Please check permissions." }
};

export default function GuidePage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🎯 語音錄音狀態管理
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 🎯 從 MainLayout 取得全域語系狀態
  const context = useOutletContext<any>();
  const currentLang = (context && typeof context === "object" && context.currentLang === "en") ? "en" : "zh";

  // 📸 觸發原生相機或檔案選取
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 📸 當使用者拍完照或選完圖片
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // 帶著圖片檔案前往 Loading 頁面
    navigate("/guide/loading", { state: { imageFile: file } });
  };

  // ✍️ 文字搜尋送出
  const handleSendQuery = () => {
    const text = message.trim();
    if (!text) return;

    // 帶著純文字查詢前往 Loading 頁面，交由後端做多模態景點辨識
    navigate("/guide/loading", { state: { textQuery: text } });
    setMessage("");
  };

  // 🎤 點擊切換錄音狀態：按一下開始錄音，再按一下停止並送出
  const toggleRecording = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (isRecording) {
      // 🎯 停止錄音並送出
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    } else {
      // 🎯 開始錄製語音
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          // 錄音結束，直接帶著語音二進位 Blob 前往 Loading 頁面，由後端做 STT 轉譯與分析
          navigate("/guide/loading", { state: { voiceBlob: audioBlob } });
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert(translations.voiceError[currentLang]);
      }
    }
  };

  return (
    <main 
      className="guide-page" 
      style={{
        height: "calc(100dvh - 120px)",
        minHeight: "auto",
        padding: "16px 16px 24px 16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* 隱藏的原生 File Input，支援手機呼叫相機 */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* 上半部：相機大按鈕與介紹區 */}
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
          className={`guide-camera-circle ${isRecording ? "recording-pulse" : ""}`} 
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

      {/* 下半部：打字輸入與麥克風按鈕區 */}
      <section 
        className="guide-home-input-container"
        style={{ marginTop: 0, paddingBottom: 0 }}
      >
        <div className="guide-chat-input-wrap">
          <input
            type="text"
            placeholder={translations.placeholder[currentLang]}
            value={message}
            disabled={isRecording}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSendQuery();
              }
            }}
          />

          {/* 麥克風按鈕：改為單擊 onClick 進行狀態切換，完美支援手機與桌機 */}
          <button 
            type="button" 
            className={`guide-mic-button ${isRecording ? "recording" : ""}`}
            title="Voice Input"
            onClick={toggleRecording}
          >
            {isRecording ? <Square size={16} style={{ color: "#ef4444" }} /> : <Mic size={18} />}
          </button>

          <button 
            type="button" 
            className="guide-send-button" 
            onClick={handleSendQuery}
            disabled={!message.trim() || isRecording}
          >
            <Send size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}