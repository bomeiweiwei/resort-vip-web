import { useState, useEffect, useRef } from "react";
import { Camera, Image as ImageIcon, Mic, Send, Square, AlertCircle } from "lucide-react";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom"; // 🎯 引入 useLocation 來獲取路由攜帶的狀態
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

const getSupportedAudioMimeType = (): string => {
  if (!window.MediaRecorder) return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) return "audio/ogg;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
};

export default function GuidePage() {
  const navigate = useNavigate();
  const location = useLocation(); // 🎯 宣告 location 監聽路由狀態
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const context = useOutletContext<any>();
  const currentLang = (context && typeof context === "object" && context.currentLang === "en") ? "en" : "zh";

  const [searchText, setSearchText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  // 🎯 調整型態：支援普通字串或 { zh, en } 雙語物件
  const [errorToast, setErrorToast] = useState<string | { zh: string; en: string } | null>(null);

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

  // 🎯 偵測並讀取從其他頁面（如分析失敗或找不到景點）跳轉回來的雙語錯誤提示
  useEffect(() => {
    if (location.state?.errorMsg) {
      setErrorToast(location.state.errorMsg);
      // 🎯 顯示後立即清除 Router 歷史狀態，防止房客重新整理頁面時錯誤重複跳出
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // 🎯 設定 4 秒後自動關閉橫幅
  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

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
        const mimeType = getSupportedAudioMimeType();
        const convertBlobToWav = async (blob: Blob): Promise<Blob> => {
          const arrayBuffer = await blob.arrayBuffer();

          const audioContext = new AudioContext();
          const decodedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          await audioContext.close();

          const targetSampleRate = 16000;
          const numberOfChannels = 1;
          const targetLength = Math.ceil(decodedAudioBuffer.duration * targetSampleRate);

          const offlineContext = new OfflineAudioContext(
            numberOfChannels,
            targetLength,
            targetSampleRate
          );

          const source = offlineContext.createBufferSource();
          source.buffer = decodedAudioBuffer;
          source.connect(offlineContext.destination);
          source.start(0);

          const renderedBuffer = await offlineContext.startRendering();
          const monoData = renderedBuffer.getChannelData(0);

          return encodeWavPCM16(monoData, targetSampleRate);
        };

        const encodeWavPCM16 = (samples: Float32Array, sampleRate: number): Blob => {
          const numChannels = 1;
          const bitsPerSample = 16;
          const bytesPerSample = bitsPerSample / 8;
          const blockAlign = numChannels * bytesPerSample;
          const byteRate = sampleRate * blockAlign;
          const dataSize = samples.length * bytesPerSample;
          const buffer = new ArrayBuffer(44 + dataSize);
          const view = new DataView(buffer);

          writeString(view, 0, "RIFF");
          view.setUint32(4, 36 + dataSize, true);
          writeString(view, 8, "WAVE");

          writeString(view, 12, "fmt ");
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true); // PCM
          view.setUint16(22, numChannels, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, byteRate, true);
          view.setUint16(32, blockAlign, true);
          view.setUint16(34, bitsPerSample, true);

          writeString(view, 36, "data");
          view.setUint32(40, dataSize, true);

          let offset = 44;
          for (let i = 0; i < samples.length; i++) {
            const sample = Math.max(-1, Math.min(1, samples[i]));
            const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            view.setInt16(offset, int16, true);
            offset += 2;
          }

          return new Blob([buffer], { type: "audio/wav" });
        };

        const writeString = (view: DataView, offset: number, value: string) => {
          for (let i = 0; i < value.length; i++) {
            view.setUint8(offset + i, value.charCodeAt(i));
          }
        };
        const mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
          try {
            const audioType = mediaRecorder.mimeType || mimeType || "audio/webm";

            const rawAudioBlob = new Blob(audioChunksRef.current, {
              type: audioType,
            });

            const wavBlob = await convertBlobToWav(rawAudioBlob);

            const wavFile = new File(
              [wavBlob],
              `guide_voice_${Date.now()}.wav`,
              { type: "audio/wav" }
            );

            navigate("/guide/loading", {
              state: { voiceBlob: wavFile },
            });
          } catch (error) {
            console.error("錄音檔轉 WAV 失敗：", error);
            // 🎯 改為雙語物件
            setErrorToast({
              zh: "錄音檔分析失敗，請重新錄音。",
              en: "Audio analysis failed, please record again."
            });
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        // 🎯 改為傳入雙語字典
        setErrorToast(translations.voiceError);
      }
    }
  };

  return (
    <main className="guide-page">
      {/* 🎯 自訂高雅 Toast UI 橫幅：依據當前 currentLang 動態解析中英字串 */}
      {errorToast && (
        <div className="luxury-toast">
          <AlertCircle size={18} style={{ color: "#10b981" }} />
          <span>
            {typeof errorToast === "string" 
              ? errorToast 
              : (errorToast[currentLang] || errorToast.zh)
            }
          </span>
          <button
            onClick={() => setErrorToast(null)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.6)",
              cursor: "pointer",
              fontSize: "18px",
              marginLeft: "10px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

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