import { useState, useEffect, useRef } from "react";
import { Camera, Image as ImageIcon, Mic, Search, Send, Square } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
// 🎯 修正引用：依據您的目錄結構，正確指向 styles 資料夾下的 guide.css
import "../styles/guide.css";

const translations = {
  title: { zh: "AI 專屬語音導遊", en: "AI Personal Audio Guide" },
  subTitle: { 
    zh: "拍下園區內任何景點、藝術品或植物，系統將自動為您進行語音導覽，並可深入互動問答。", 
    en: "Take a photo of any resort attraction, artwork, or plant. The system will automatically provide audio tours and interactive Q&As." 
  },
  uploadBtn: { zh: "拍照 / 上傳圖片", en: "Take Photo / Upload Image" },
  placeholder: { zh: "輸入景點/設施：讓我們為您解說", en: "Type attraction/facility for guide..." },
  voiceRecording: { zh: "🎤 [正在錄音，點擊紅色按鈕結束並送出]", en: "🎤 [Recording, click red button to stop & send]" },
  voiceError: { zh: "無法存取麥克風設備，請確認權限。", en: "Unable to access microphone. Please check permissions." }
};

export default function GuidePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const context = useOutletContext<any>();
  const currentLang = (context && typeof context === "object" && context.currentLang === "en") ? "en" : "zh";

  const [searchText, setSearchText] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 🎯 核心防禦：鎖定 Body 滾動與高度，徹底關閉外部滾動條與橡皮筋回彈
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;

    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";

    return () => {
      // 卸載時回復原設定
      document.body.style.overflow = originalOverflow;
      document.body.style.height = originalHeight;
    };
  }, []);

  // 🎯 處理照片上傳與相機拍完照
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      // 帶著圖片檔案，轉場前往 Loading 中介頁面
      navigate("/guide/loading", { state: { imageFile: selectedFile } });
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // 🎯 處理文字查詢送出
  const handleTextSearch = () => {
    const query = searchText.trim();
    if (!query) return;
    setSearchText("");
    // 帶著文字查詢，轉場前往 Loading 中介頁面
    navigate("/guide/loading", { state: { textQuery: query } });
  };

  // 🎯 語音單擊 Toggle 錄音控制
  const toggleRecording = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (isRecording) {
      // 停止錄音，觸發 mediaRecorder.onstop 並送出
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    } else {
      // 開始錄音
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
          // 帶著語音 Blob，轉場前往 Loading 中介頁面
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
    <main className="guide-page">
      {/* 隱藏的實體上傳 Input (支援相機拍照 capture) */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        style={{ display: "none" }} 
        onChange={handleFileChange} 
      />

      {/* 1. 上半部：高雅的虛線圓圈與相機圖標 */}
      <section className="guide-hero">
        <div className="guide-camera-circle" onClick={triggerUpload}>
          <Camera size={40} />
        </div>

        {/* 標題與說明文案 */}
        <div>
          <h2>{translations.title[currentLang]}</h2>
          <p>{translations.subTitle[currentLang]}</p>
        </div>

        {/* 拍照 / 上傳圖片大按鈕 */}
        <button
          type="button"
          className="guide-upload-button"
          onClick={triggerUpload}
        >
          <ImageIcon size={18} />
          <span>{translations.uploadBtn[currentLang]}</span>
        </button>
      </section>

      {/* 2. 下半部：置底的輸入框組合（不論怎麼滑，都優雅固定） */}
      <section className="guide-home-input-container">
        <div className="guide-chat-input-wrap">
          <input 
            type="text" 
            placeholder={isRecording ? translations.voiceRecording[currentLang] : translations.placeholder[currentLang]}
            value={searchText} 
            disabled={isRecording}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSearch()}
          />
          
          {/* 麥克風錄音按鈕 */}
          <button 
            type="button" 
            className={`guide-mic-button ${isRecording ? "recording" : ""}`}
            onClick={toggleRecording}
          >
            {isRecording ? <Square size={16} /> : <Mic size={18} />}
          </button>

          {/* 送出按鈕 */}
          <button 
            type="button" 
            className="guide-send-button"
            onClick={handleTextSearch}
            disabled={!searchText.trim() || isRecording}
          >
            <Send size={14} />
          </button>
        </div>
      </section>
    </main>
  );
}