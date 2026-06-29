import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MapPin, Mic, Pause, Play, Send, Square, AlertCircle } from "lucide-react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
// 🎯 匯入統一管理的 API 函數 (指向相對路徑 src/apis/guideApi.ts)
import { analyzeGuideInput, synthesizeGuideSpeech } from "../apis/guideApi";
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
};

const normalizeGuideLanguage = (language?: string): string => {
  const value = (language || "").toLowerCase();

  if (value.startsWith("en")) return "en-US";
  if (value.startsWith("ja")) return "ja-JP";
  if (value.startsWith("ko")) return "ko-KR";
  if (value.startsWith("zh")) return "zh-TW";

  return "zh-TW";
};

const detectLanguageFromText = (text?: string, fallback = "zh-TW"): string => {
  const value = (text || "").trim();

  if (!value) return normalizeGuideLanguage(fallback);
  if (/[\u3040-\u30ff]/.test(value)) return "ja-JP";
  if (/[\uac00-\ud7af]/.test(value)) return "ko-KR";
  if (/[\u4e00-\u9fff]/.test(value)) return "zh-TW";
  if (/[A-Za-z]/.test(value)) return "en-US";

  return normalizeGuideLanguage(fallback);
};

/**
 * 給 TTS 使用的前端保險處理。
 * 正常情況應該使用後端回傳的 guideMessageText。
 * 這個函式是避免 mock 或舊版後端只回傳 guideMessage 時，TTS 念出 Markdown 符號。
 */
const markdownToSpeechText = (text?: string): string => {
  return (text || "")
    // 移除圖片 Markdown：![alt](url)
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    // 連結 Markdown：[文字](url) -> 文字
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    // 移除粗體、斜體、刪除線、inline code、標題、引用符號
    .replace(/[*_~`>#]/g, "")
    // 移除 unordered list 前綴
    .replace(/^\s*[-+]\s+/gm, "")
    // 移除 ordered list 前綴
    .replace(/^\s*\d+\.\s+/gm, "")
    // 移除 Markdown 分隔線
    .replace(/^\s*-{3,}\s*$/gm, "")
    // 壓縮過多空行
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const getGuideSpeechText = (result?: {
  guideMessage?: string;
  guideMessageText?: string;
}): string => {
  const plainText = (result?.guideMessageText || "").trim();

  if (plainText) {
    return plainText;
  }

  return markdownToSpeechText(result?.guideMessage);
};

const getSupportedAudioMimeType = (): string => {
  if (!window.MediaRecorder) return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) return "audio/ogg;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
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
  const mainAudioObjectUrlRef = useRef<string | null>(null);
  const chatAudioObjectUrlRef = useRef<string | null>(null);

  // 避免 React 18 StrictMode 在開發環境重複觸發 TTS，造成兩段語音同時播放。
  const mainTtsKeyRef = useRef<string | null>(null);
  const mainTtsPromiseRef = useRef<Promise<Blob> | null>(null);
  const mainTtsRequestIdRef = useRef(0);

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

    const speechText = getGuideSpeechText(backendResult);

    const speechLanguage = backendResult.responseLanguage
      ? normalizeGuideLanguage(backendResult.responseLanguage)
      : detectLanguageFromText(
          speechText,
          currentLang === "en" ? "en-US" : "zh-TW"
        );

    const ttsKey = `${speechText}::${speechLanguage}`;
    let isCancelled = false;
    const requestId = ++mainTtsRequestIdRef.current;

    const releaseMainAudio = () => {
      if (mainAudioRef.current) {
        mainAudioRef.current.pause();
        mainAudioRef.current.onplay = null;
        mainAudioRef.current.onpause = null;
        mainAudioRef.current.onended = null;
        mainAudioRef.current.src = "";
        mainAudioRef.current = null;
      }

      if (mainAudioObjectUrlRef.current) {
        URL.revokeObjectURL(mainAudioObjectUrlRef.current);
        mainAudioObjectUrlRef.current = null;
      }

      setIsPlaying(false);
    };

    const prepareGuideSpeech = async () => {
      try {
        if (!speechText) return;

        // 同一段導覽文字 + 同一語系，只建立一個 TTS 請求。
        // React 18 StrictMode 在 dev 會讓 useEffect 跑兩次，這裡可以避免產生兩個 audio。
        if (mainTtsKeyRef.current !== ttsKey || !mainTtsPromiseRef.current) {
          releaseMainAudio();
          mainTtsKeyRef.current = ttsKey;
          mainTtsPromiseRef.current = synthesizeGuideSpeech({
            text: speechText,
            language: speechLanguage,
          });
        }

        const audioBlob = await mainTtsPromiseRef.current;

        // 如果這次 effect 已經被清理，或有更新的 TTS 請求，就不要建立 audio。
        if (isCancelled || requestId !== mainTtsRequestIdRef.current) return;

        releaseMainAudio();

        const audioObjectUrl = URL.createObjectURL(audioBlob);
        mainAudioObjectUrlRef.current = audioObjectUrl;

        const audio = new Audio(audioObjectUrl);
        audio.playbackRate = 1.15;
        mainAudioRef.current = audio;

        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => setIsPlaying(false);

        // 不自動播放。只準備語音，讓使用者按播放按鈕。
        // 這樣可以避免 StrictMode 或瀏覽器自動播放造成「多一段不能暫停的語音」。
        setIsPlaying(false);
      } catch (error) {
        if (isCancelled) return;
        console.error("Guide TTS failed:", error);
        setErrorToast("語音導覽產生失敗，請稍後再試。");
      }
    };

    prepareGuideSpeech();

    return () => {
      isCancelled = true;
      mainAudioRef.current?.pause();
      chatAudioRef.current?.pause();

      if (chatAudioObjectUrlRef.current) {
        URL.revokeObjectURL(chatAudioObjectUrlRef.current);
        chatAudioObjectUrlRef.current = null;
      }
    };
  }, [backendResult, navigate, currentLang]);

  // 智慧滾動對策：Web 滾動內層，Mobile 滾動視窗
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      chatListEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const playChatSpeech = async (text: string, language?: string) => {
    const speechText = markdownToSpeechText(text);

    if (!speechText.trim()) return;

    try {
      chatAudioRef.current?.pause();

      if (mainAudioRef.current && !mainAudioRef.current.paused) {
        mainAudioRef.current.pause();
      }

      if (chatAudioObjectUrlRef.current) {
        URL.revokeObjectURL(chatAudioObjectUrlRef.current);
        chatAudioObjectUrlRef.current = null;
      }

      const audioBlob = await synthesizeGuideSpeech({
        text: speechText,
        language: language
          ? normalizeGuideLanguage(language)
          : detectLanguageFromText(
              speechText,
              currentLang === "en" ? "en-US" : "zh-TW"
            ),
      });

      const audioObjectUrl = URL.createObjectURL(audioBlob);
      chatAudioObjectUrlRef.current = audioObjectUrl;

      const nextAudio = new Audio(audioObjectUrl);
      nextAudio.playbackRate = 1.15;
      chatAudioRef.current = nextAudio;

      nextAudio.play().catch((e) => console.log("Chat audio play failed:", e));
    } catch (error) {
      console.error("Guide chat TTS failed:", error);
      setErrorToast("語音導覽產生失敗，請稍後再試。");
    }
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

      const speechText = getGuideSpeechText(data);
      const speechLanguage =
        data.responseLanguage ||
        detectLanguageFromText(
          speechText || text,
          currentLang === "en" ? "en-US" : "zh-TW"
        );

      await playChatSpeech(speechText, speechLanguage);
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
        const audioType = mediaRecorderRef.current?.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: audioType });
        const userMsgId = Date.now();

        const userVoicePlaceholder: ChatMessage = {
          id: userMsgId,
          role: "user",
          text: translations.voiceSending[currentLang],
        };

        const preApiHistory = [...messagesRef.current, userVoicePlaceholder];
        setMessages(preApiHistory);

        try {
          const data = await analyzeGuideInput({
            voice: audioBlob,
            attractionTitle: backendResult?.title || "未知景點",
            language: currentLang,
            history: JSON.stringify(messagesRef.current), // 發送此音檔之前的對話歷史給後端
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

          const speechText = getGuideSpeechText(data);
          const speechLanguage =
            data.responseLanguage ||
            detectLanguageFromText(
              speechText || data.user_text || "",
              currentLang === "en" ? "en-US" : "zh-TW"
            );

          await playChatSpeech(speechText, speechLanguage);
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