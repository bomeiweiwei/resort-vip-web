import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MapPin, Mic, Pause, Play, Send, Square, AlertCircle } from "lucide-react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
// 🎯 匯入統一管理的 API 函數 (指向相對路徑 src/apis/guideApi.ts)
import { analyzeGuideInput } from "../apis/guideApi";
import "../styles/guide.css";
import "../styles/assistant.css"; // 🎯 匯入包含思考動畫與語音播放條樣式的 CSS

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  audioBase64?: string; // 🎯 儲存語音二進制，以便單獨重播
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

const toGuideImageUrl = (backendImageUrl?: string): string => {
  const imageUrl = (backendImageUrl || "").trim();

  if (!imageUrl) return "";

  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:")
  ) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/api/")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return `/api${imageUrl}`;
  }

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
  const [isPlaying, setIsPlaying] = useState(false); // 頂部主導覽語音播放狀態
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // 🎯 參考 AssistantPage 的語音播放相關狀態
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null); // 當前播放中的 Chat 訊息 ID
  const [isChatAudioPaused, setIsChatAudioPaused] = useState(false); // Chat 語音是否暫停
  const [chatProgress, setChatProgress] = useState(0); // Chat 語音播控進度百分比 (0-100)

  const [errorToast, setErrorToast] = useState<string | null>(null);

  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatAudioRef = useRef<HTMLAudioElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const chatListEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Toast 顯示 3 秒後自動隱藏
  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

  // 🎯 核心防禦：計算全域是否有任何音軌正在發聲
  const isAnyAudioPlaying = isPlaying || (playingMessageId !== null && !isChatAudioPaused);

  useEffect(() => {
    if (!backendResult) {
      navigate("/guide");
      return;
    }

    setMessages([{ id: 1, role: "assistant", text: backendResult.guideMessage }]);

    // 清空舊語音
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

      // 🎯 進入頁面立即挑戰自動播放主景點語音
      audio.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("語音自動播放被瀏覽器阻擋，需等待使用者互動:", err);
          setIsPlaying(false);
        });
    }

    return () => {
      mainAudioRef.current?.pause();
      chatAudioRef.current?.pause();
    };
  }, [backendResult, navigate]);

  // 智慧滾動對策
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      chatListEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // 🎯 播放特定的 Chat Bubble 語音回覆（支援暫停其他語音、監聽 timeupdate 進度與 ended 狀態）
  const playChatSpeech = (messageId: number, audioBase64?: string) => {
    if (!audioBase64) return;

    // 1. 先暫停主導覽語音
    if (mainAudioRef.current && !mainAudioRef.current.paused) {
      mainAudioRef.current.pause();
      setIsPlaying(false);
    }

    // 2. 暫停先前播放的 Chat 語音
    if (chatAudioRef.current) {
      chatAudioRef.current.pause();
      chatAudioRef.current = null;
    }

    const nextAudio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    chatAudioRef.current = nextAudio;
    setPlayingMessageId(messageId);
    setIsChatAudioPaused(false);
    setChatProgress(0);

    nextAudio.ontimeupdate = () => {
      if (nextAudio.duration) {
        setChatProgress((nextAudio.currentTime / nextAudio.duration) * 100);
      }
    };

    nextAudio.onended = () => {
      chatAudioRef.current = null;
      setPlayingMessageId(null);
      setIsChatAudioPaused(false);
      setChatProgress(0);
    };

    nextAudio.onerror = (e) => {
      console.error("Chat TTS 播放失敗:", e);
      chatAudioRef.current = null;
      setPlayingMessageId(null);
      setIsChatAudioPaused(false);
      setChatProgress(0);
    };

    nextAudio.play().catch((e) => {
      console.error("Chat audio play failed:", e);
      chatAudioRef.current = null;
      setPlayingMessageId(null);
      setIsChatAudioPaused(false);
    });
  };

  // 🎯 點擊 Chat 泡泡播放/暫停 Toggle
  const toggleChatPlayPause = (messageId: number, audioBase64: string) => {
    if (playingMessageId === messageId && chatAudioRef.current) {
      if (isChatAudioPaused) {
        chatAudioRef.current.play();
        setIsChatAudioPaused(false);
      } else {
        chatAudioRef.current.pause();
        setIsChatAudioPaused(true);
      }
      return;
    }
    // 播放新的語音
    playChatSpeech(messageId, audioBase64);
  };

  // 🎯 播放 / 暫停頂部大導覽 TTS 語音
  const togglePlay = () => {
    if (!mainAudioRef.current) {
      setErrorToast("語音導覽尚未準備完成，請稍候再試。");
      return;
    }

    if (isPlaying) {
      mainAudioRef.current.pause();
    } else {
      // 播放主語音時，先暫停與清空 Chat 泡泡的語音
      if (chatAudioRef.current) {
        chatAudioRef.current.pause();
        setPlayingMessageId(null);
        setIsChatAudioPaused(false);
        setChatProgress(0);
      }

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
    setIsThinking(true);

    try {
      const data = await analyzeGuideInput({
        text,
        attractionTitle: backendResult?.title || "未知景點",
        language: currentLang,
        history: JSON.stringify(currentHistory),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: data.guideMessage,
          // 🎯 文字輸入：不附帶 audioBase64 也不會自動播放音檔
        },
      ]);
    } catch (err: any) {
      console.error("Send message error:", err);
      const backendErrorMsg = err.response?.data?.detail;
      setErrorToast(backendErrorMsg || "發送訊息失敗，請稍後再試。");
    } finally {
      setIsThinking(true);
      setTimeout(() => setIsThinking(false), 300); // 縮短或立即結束
    }
  };

  // 語音追問切換
  const toggleRecording = async (e: React.MouseEvent) => {
    e.preventDefault();

    // 🎯 核心防呆機制：若當前正在播放語音，且此時不是處於錄音狀態，拒絕使用者開始錄音
    if (isAnyAudioPlaying && !isRecording) {
      setErrorToast("正在播放語音中，請先暫停播放再進行錄音。");
      return;
    }

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }

      setIsRecording(false);
      return;
    }

    // 啟動錄音前先極致防禦性暫停所有可能正在播放的音軌
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
        const replyMsgId = userMsgId + 1;
        const historyBeforeVoice = [...messagesRef.current];

        const userVoicePlaceholder: ChatMessage = {
          id: userMsgId,
          role: "user",
          text: translations.voiceSending[currentLang],
        };

        setMessages([...historyBeforeVoice, userVoicePlaceholder]);
        setIsThinking(true);

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

          const data = await analyzeGuideInput({
            voice: audioFile,
            attractionTitle: backendResult?.title || "未知景點",
            language: currentLang,
            history: JSON.stringify(historyBeforeVoice),
          });

          setMessages((prev) =>
            prev
              .map((msg) =>
                msg.id === userMsgId
                  ? { ...msg, text: `🎤 ${data.user_text || "..."}` }
                  : msg
              )
              .concat({
                id: replyMsgId,
                role: "assistant",
                text: data.guideMessage,
                audioBase64: data.audio_base64, // 🎯 語音輸入：將 base64 儲存起來供 UI 渲染控制條
              })
          );

          // 🎯 語音輸入：自動播放回覆語音，並展開控制條
          if (data.audio_base64) {
            playChatSpeech(replyMsgId, data.audio_base64);
          }
        } catch (err: any) {
          console.error(err);
          const backendErrorMsg = err.response?.data?.detail;
          setErrorToast(
            backendErrorMsg || 
            (currentLang === "zh" ? "發送訊息失敗，請稍後再試。" : "Failed to send message, please try again later.")
          );
        } finally {
          setIsThinking(false);
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
        height: "100dvh", 
        overflow: "hidden", 
      }}
    >
      {/* Toast UI 保持在上方 */}
      {errorToast && (
        <div className="luxury-toast">
          <AlertCircle size={18} style={{ color: "#10b981" }} />
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

      {/* Hero 區塊與音訊卡片：設定 flex-shrink: 0 確保不被壓縮 */}
      <section className="guide-result-hero" style={{ flexShrink: 0, backgroundImage: `linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, var(--dark-slate) 100%), url(${heroImageUrl})` }}>
        <button type="button" className="guide-restart-button" onClick={() => navigate("/guide")}>
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

      <section className="guide-audio-card" style={{ flexShrink: 0 }}>
        <button type="button" className="guide-audio-button" onClick={togglePlay}>
          {isPlaying ? (
            <Pause size={22} style={{ display: 'block', color: 'inherit' }} />
          ) : (
            <Play size={22} style={{ display: 'block', color: 'inherit' }} />
          )}
        </button>
        <div className="guide-audio-track">
          <div className="guide-audio-progress" style={{ width: isPlaying ? "85%" : "0%" }} />
        </div>
      </section>

      {/* 聊天列表：設定 flex-grow: 1 讓它自動佔滿中間所有剩餘空間 */}
      <section className="guide-chat-list" style={{ flexGrow: 1, overflowY: "auto", paddingBottom: "20px" }}>
        {messages.map((item) => (
          <div key={item.id} className={item.role === "user" ? "guide-chat-row guide-chat-row-user" : "guide-chat-row guide-chat-row-assistant"}>
            <div className="guide-chat-bubble">
              {item.role === "assistant" ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.text}</ReactMarkdown>
                  
                  {/* 🎯 語音回覆的泡泡：顯示與禮賓管家同款的「暫停/播放」介面進度條 */}
                  {item.audioBase64 && (
                    <div className="audio-playback-bar" style={{ marginTop: "12px" }}>
                      <button
                        type="button"
                        className="playback-toggle"
                        onClick={() => toggleChatPlayPause(item.id, item.audioBase64!)}
                        title={playingMessageId === item.id && !isChatAudioPaused ? "暫停語音" : "播放語音"}
                      >
                        {playingMessageId === item.id && !isChatAudioPaused ? (
                          <Pause size={14} />
                        ) : (
                          <Play size={14} />
                        )}
                      </button>
                      <div className="playback-track">
                        <div
                          className="playback-progress"
                          style={{
                            width: `${playingMessageId === item.id ? chatProgress : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                item.text
              )}
            </div>
          </div>
        ))}

        {/* 思考中動畫 */}
        {isThinking && (
          <div className="guide-chat-row guide-chat-row-assistant">
            <div className="guide-chat-bubble thinking-bubble">
              <span>🤖 正在思考</span>
              <div className="thinking-assistant-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatListEndRef} />
      </section>

      {/* 底部輸入區 */}
      <section
        className="guide-chat-input-area"
        style={{
          flexShrink: 0,
          width: "100%",
          backgroundColor: "#ffffff",
          padding: "16px",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
          borderTop: "1px solid #e2e8f0"
        }}
      >
        <div 
          className="guide-chat-input-wrap" 
          style={{ 
            display: "flex", 
            gap: "8px", 
            alignItems: "center",
            width: "100%",      
            boxSizing: "border-box" 
          }}
        >
          <input
            type="text"
            placeholder={translations.placeholder[currentLang]}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isRecording && handleSend()}
            disabled={isRecording}
            style={{ 
              flex: 1, 
              minWidth: 0, 
              border: "none", 
              outline: "none" 
            }}
          />
          {/* 🎯 錄音防呆：當任何語音 (頂部大音軌或聊天音軌) 正在播放時，禁用按鈕且點擊會觸發 Toast 防護 */}
          <button 
            type="button" 
            className={`guide-mic-button ${isRecording ? "recording" : ""} ${(isAnyAudioPlaying && !isRecording) ? "disabled" : ""}`} 
            onClick={toggleRecording}
            disabled={isThinking || (isAnyAudioPlaying && !isRecording)}
            style={{ flexShrink: 0, opacity: (isAnyAudioPlaying && !isRecording) ? 0.4 : 1 }}
          >
            {isRecording ? <Square size={16} style={{ color: "#ef4444" }} /> : <Mic size={18} />}
          </button>
          <button 
            type="button" 
            className="guide-send-button" 
            onClick={handleSend} 
            disabled={!message.trim() || isRecording || isThinking}
            style={{ flexShrink: 0 }}
          >
            <Send size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}