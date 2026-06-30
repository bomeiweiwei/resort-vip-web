import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MapPin, Mic, Pause, Play, Send, Square, AlertCircle } from "lucide-react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
// 🎯 匯入統一管理的 API 函數 (指向相對路徑 src/apis/guideApi.ts)
import { analyzeGuideInput } from "../apis/guideApi";
import "../styles/guide.css";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

type GuideAnalysisResult = {
  success?: boolean;
  title?: string;
  location?: string;
  guideMessage: string;
  guideMessageText?: string;
  audioUrl?: string;
  imageUrl?: string;
  user_text?: string;
  responseLanguage?: string;
  audio_base64?: string;
};

const getSupportedAudioMimeType = (): string => {
  if (!window.MediaRecorder) return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) return "audio/ogg;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
};

const createAudioContext = (): AudioContext => {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("目前瀏覽器不支援 AudioContext，無法轉換 WAV。");
  }

  return new AudioContextClass();
};

/**
 * 將 MediaRecorder 錄到的 webm / ogg / mp4 音檔轉成真正的 WAV。
 * 輸出格式：audio/wav、PCM、16000 Hz、16-bit、Mono。
 */
const convertBlobToWav = async (blob: Blob): Promise<Blob> => {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = createAudioContext();

  try {
    const decodedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const targetSampleRate = 16000;
    const targetChannels = 1;
    const targetLength = Math.max(
      1,
      Math.ceil(decodedAudioBuffer.duration * targetSampleRate)
    );

    const offlineContext = new OfflineAudioContext(
      targetChannels,
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
  } finally {
    await audioContext.close().catch(() => undefined);
  }
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

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // Audio format: 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
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

const translations = {
  retake: { zh: "重拍", en: "Retake" },
  placeholder: { zh: "輸入文字或點擊右方錄音...", en: "Type a message or click mic to record..." },
  voiceSending: { zh: "🎤 [語音訊息處理中...]", en: "🎤 [Processing voice message...]" },
  voiceError: { zh: "無法存取麥克風設備，請確認權限。", en: "Unable to access microphone. Please check permissions." },
  ttsBlock: { zh: "語音自動播放已被阻擋，請手動點擊 Play。", en: "Audio auto-play blocked. Please click play to listen." },
};

/**
 * 🎯 景點圖片解析器
 * 優先採用後端 Python 回傳之圖片路徑，若無則精準 fallback。
 */
const toGuideImageUrl = (backendImageUrl?: string): string => {
  const imageUrl = (backendImageUrl || "").trim();

  if (!imageUrl) return "";

  // 後端若回傳完整網址或 data URL，直接使用。
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:")
  ) {
    return imageUrl;
  }

  // 後端若已經回傳 /api/guide/images/...，不要再補一次 /api。
  if (imageUrl.startsWith("/api/")) {
    return imageUrl;
  }

  // 後端若回傳 /guide/images/...，前端才補上 /api。
  if (imageUrl.startsWith("/")) {
    return `/api${imageUrl}`;
  }

  // 後端若回傳 guide/images/...，補成 /api/guide/images/...
  return `/api/${imageUrl}`;
};

const getAttractionImage = (title: string, backendImageUrl?: string): string => {
  const normalizedBackendImageUrl = toGuideImageUrl(backendImageUrl);

  if (normalizedBackendImageUrl) {
    return normalizedBackendImageUrl;
  }

  const lowerTitle = (title || "").toLowerCase();

  if (lowerTitle.includes("亭") || lowerTitle.includes("pavilion")) {
    return "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&w=800&q=80";
  }

  if (lowerTitle.includes("水舞") || lowerTitle.includes("fountain") || lowerTitle.includes("plaza")) {
    return "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80";
  }

  if (lowerTitle.includes("泳池") || lowerTitle.includes("pool")) {
    return "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80";
  }

  return "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80";
};

export default function GuideResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const context = useOutletContext<any>();
  const currentLang =
    context && typeof context === "object" && context.currentLang === "en"
      ? "en"
      : "zh";

  const backendResult = location.state?.analysisResult as GuideAnalysisResult | undefined;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // 🎯 自訂 Toast 錯誤狀態，用來取代不安全的原生 alert()
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatAudioRef = useRef<HTMLAudioElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 用於 Web 底端對話自動滑動定位的錨點
  const chatListEndRef = useRef<HTMLDivElement | null>(null);

  // React 專利：用 messagesRef 鎖定對話，防止非同步 MediaRecorder 閉包抓到舊狀態
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 🎯 Toast 顯示 3 秒後自動隱藏
  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

  useEffect(() => {
    if (!backendResult) {
      navigate("/guide");
      return;
    }

    setMessages([{ id: 1, role: "assistant", text: backendResult.guideMessage }]);

    if (mainAudioRef.current) {
      mainAudioRef.current.pause();
      mainAudioRef.current.onplay = null;
      mainAudioRef.current.onpause = null;
      mainAudioRef.current.onended = null;
      mainAudioRef.current.src = "";
      mainAudioRef.current = null;
    }
    setIsPlaying(false);

    if (backendResult.audio_base64) {
      const audio = new Audio(`data:audio/mp3;base64,${backendResult.audio_base64}`);
      mainAudioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => setIsPlaying(false);

      // 不自動播放。只準備語音，讓使用者按播放按鈕。
    }

    return () => {
      mainAudioRef.current?.pause();
      chatAudioRef.current?.pause();
    };
  }, [backendResult, navigate]);

  // 智慧滾動對策：Web 滾動內層，Mobile 滾動視窗
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      chatListEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const playChatSpeech = (audioBase64?: string) => {
    if (!audioBase64) return;

    chatAudioRef.current?.pause();

    if (mainAudioRef.current && !mainAudioRef.current.paused) {
      mainAudioRef.current.pause();
    }

    const nextAudio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    chatAudioRef.current = nextAudio;

    nextAudio.play().catch((e) => console.log("Chat audio play failed:", e));
  };

  // 🎯 播放 / 暫停導遊 TTS 語音
  const togglePlay = () => {
    if (!mainAudioRef.current) {
      setErrorToast("語音導覽尚未準備完成，請稍候再試。");
      return;
    }

    if (isPlaying) {
      mainAudioRef.current.pause();
    } else {
      chatAudioRef.current?.pause();
      mainAudioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  // 文字追問
  const handleSend = async () => {
    const text = message.trim();

    if (!text) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text,
    };

    const currentHistory = [...messages, userMessage];

    setMessages(currentHistory);
    setMessage("");

    try {
      const data = await analyzeGuideInput({
        text,
        attractionTitle: backendResult?.title || "未知景點",
        language: currentLang,
        history: JSON.stringify(currentHistory), // 將包含最新訊息的歷史對話轉 JSON 發送
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: data.guideMessage,
        },
      ]);

      playChatSpeech(data.audio_base64);
    } catch (err: any) {
      console.error("Send message error:", err);
      const backendErrorMsg = err.response?.data?.detail;
      setErrorToast(backendErrorMsg || "發送訊息失敗，請稍後再試。");
    }
  };

  // 語音追問切換
  const toggleRecording = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }

      setIsRecording(false);
      return;
    }

    if (mainAudioRef.current) mainAudioRef.current.pause();
    if (chatAudioRef.current) chatAudioRef.current.pause();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const userMsgId = Date.now();
        const historyBeforeVoice = [...messagesRef.current];

        const userVoicePlaceholder: ChatMessage = {
          id: userMsgId,
          role: "user",
          text: translations.voiceSending[currentLang],
        };

        setMessages([...historyBeforeVoice, userVoicePlaceholder]);

        try {
          const audioType = mediaRecorderRef.current?.mimeType || mimeType || "audio/webm";

          const rawAudioBlob = new Blob(audioChunksRef.current, {
            type: audioType,
          });

          const wavBlob = await convertBlobToWav(rawAudioBlob);

          const audioFile = new File(
            [wavBlob],
            `guide_voice_${Date.now()}.wav`,
            { type: "audio/wav" }
          );

          // 這裡送出的 voice 已經是真正的 WAV：audio/wav、PCM、16000 Hz、16-bit、Mono。
          const data = await analyzeGuideInput({
            voice: audioFile,
            attractionTitle: backendResult?.title || "未知景點",
            language: currentLang,
            history: JSON.stringify(historyBeforeVoice), // 發送此音檔之前的對話歷史給後端
          });

          setMessages((prev) =>
            prev
              .map((msg) =>
                msg.id === userMsgId
                  ? { ...msg, text: `🎤 ${data.user_text || "..."}` }
                  : msg
              )
              .concat({
                id: Date.now() + 1,
                role: "assistant",
                text: data.guideMessage,
              })
          );

          playChatSpeech(data.audio_base64);
        } catch (err: any) {
          console.error(err);
          const backendErrorMsg = err.response?.data?.detail;
          setErrorToast(backendErrorMsg || "語音分析失敗，請稍後再試。");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setErrorToast(translations.voiceError[currentLang]);
    }
  };

  const currentTitle = backendResult?.title || "互動導遊解說";
  const currentLocation = backendResult?.location || "渡假村景區";
  const heroImageUrl = getAttractionImage(currentTitle, backendResult?.imageUrl);

  return (
    <main
      className="guide-result-page"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        paddingBottom: "150px",
      }}
    >
      {/* 🎯 CSS 內嵌樣式表：Web 狀態優化，而絕對不改動手機版原有外觀樣式 */}
      <style>{`
        @media (min-width: 1024px) {
          .guide-result-page {
            position: relative !important;
            height: calc(100vh - 85px) !important;
            min-height: auto !important;
            padding-bottom: 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .guide-chat-list {
            flex: 1 !important;
            overflow-y: auto !important;
            padding-bottom: 120px !important;
          }
          .guide-chat-input-area {
            position: absolute !important;
            bottom: 24px !important;
            left: 24px !important;
            right: 24px !important;
            width: auto !important;
            background-color: transparent !important;
            z-index: 50 !important;
          }
          .guide-chat-input-wrap {
            max-width: 800px !important;
            margin: 0 auto !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
            border: 1px solid #edf2f7 !important;
            background-color: #ffffff !important;
          }
        }
      `}</style>

      {/* 🎯 自訂 Toast 橫幅 UI：高雅、精緻，符合豪華渡假村風格 */}
      {errorToast && (
        <div
          style={{
            position: "absolute",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#1e293b",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "30px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
            zIndex: 9999,
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            whiteSpace: "nowrap",
          }}
        >
          <AlertCircle size={18} style={{ color: "#f59e0b" }} />
          <span>{errorToast}</span>
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

      <section
        className="guide-result-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, var(--dark-slate) 100%), url(${heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <button
          type="button"
          className="guide-restart-button"
          onClick={() => navigate("/guide")}
        >
          {translations.retake[currentLang]}
        </button>

        <div className="guide-result-info">
          <h1>{currentTitle}</h1>
          <div className="guide-result-location">
            <MapPin size={16} />
            <span>{currentLocation}</span>
          </div>
        </div>
      </section>

      <section className="guide-audio-card">
        <button type="button" className="guide-audio-button" onClick={togglePlay}>
          {isPlaying ? <Pause size={22} /> : <Play size={22} />}
        </button>

        <div className="guide-audio-track">
          <div
            className="guide-audio-progress"
            style={{ width: isPlaying ? "85%" : "0%" }}
          />
        </div>
      </section>

      <section className="guide-chat-list" style={{ flexGrow: 1, paddingBottom: "20px" }}>
        {messages.map((item) => (
          <div
            key={item.id}
            className={
              item.role === "user"
                ? "guide-chat-row guide-chat-row-user"
                : "guide-chat-row guide-chat-row-assistant"
            }
          >
            <div className="guide-chat-bubble">
              {item.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.text}
                </ReactMarkdown>
              ) : (
                item.text
              )}
            </div>
          </div>
        ))}

        {/* 用於 Web 獨立滾動的錨點 */}
        <div ref={chatListEndRef} />
      </section>

      <section
        className="guide-chat-input-area"
        style={{
          position: "fixed",
          bottom: "65px",
          left: 0,
          width: "100%",
          zIndex: 99,
          backgroundColor: "#ffffff",
        }}
      >
        <div className="guide-chat-input-wrap">
          <input
            type="text"
            placeholder={translations.placeholder[currentLang]}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          {/* 麥克風按鈕：單擊 onClick 進行錄音狀態切換 */}
          <button
            type="button"
            className={`guide-mic-button ${isRecording ? "recording" : ""}`}
            onClick={toggleRecording}
          >
            {isRecording ? (
              <Square size={16} style={{ color: "#ef4444" }} />
            ) : (
              <Mic size={18} />
            )}
          </button>

          <button
            type="button"
            className="guide-send-button"
            onClick={handleSend}
            disabled={!message.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}