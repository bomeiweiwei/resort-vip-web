import { useState, useEffect, useRef } from "react";
import { MapPin, Mic, Pause, Play, Send, Square } from "lucide-react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
// 🎯 匯入統一管理的 API 函數 (指向相對路徑 src/apis/guideApi.ts)
import { analyzeGuideInput } from "../apis/guideApi"; 

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const translations = {
  retake: { zh: "重拍", en: "Retake" },
  placeholder: { zh: "輸入文字或點擊右方錄音...", en: "Type a message or click mic to record..." },
  voiceSending: { zh: "🎤 [語音訊息處理中...]", en: "🎤 [Processing voice message...]" },
  voiceError: { zh: "無法存取麥克風設備，請確認權限。", en: "Unable to access microphone. Please check permissions." },
  ttsBlock: { zh: "語音自動播放已被阻擋，請手動點擊 Play。", en: "Audio auto-play blocked. Please click play to listen." }
};

const getAttractionImage = (title: string): string => {
  const lowerTitle = (title || "").toLowerCase();
  if (lowerTitle.includes("亭") || lowerTitle.includes("pavilion")) {
    return "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&w=800&q=80";
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
  const currentLang = (context && typeof context === "object" && context.currentLang === "en") ? "en" : "zh";

  const backendResult = location.state?.analysisResult;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!backendResult) {
      navigate("/guide");
      return;
    }

    setMessages([{ id: 1, role: "assistant", text: backendResult.guideMessage }]);
    
    if (backendResult.audioUrl) {
      const fullUrl = backendResult.audioUrl.startsWith("http") ? backendResult.audioUrl : `/api${backendResult.audioUrl}`;
      const audio = new Audio(fullUrl);
      audio.playbackRate = 1.25;
      mainAudioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => setIsPlaying(false);

      audio.play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.log(translations.ttsBlock[currentLang], e));
    }

    return () => {
      mainAudioRef.current?.pause();
      chatAudioRef.current?.pause();
    };
  }, [backendResult, navigate]);

  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const playChatAudio = (url: string) => {
    chatAudioRef.current?.pause();
    if (mainAudioRef.current && !mainAudioRef.current.paused) {
      mainAudioRef.current.pause(); 
    }
    const fullUrl = url.startsWith("http") ? url : `/api${url}`;
    const nextAudio = new Audio(fullUrl);
    nextAudio.playbackRate = 1.25;
    chatAudioRef.current = nextAudio;
    nextAudio.play().catch((e) => console.log("Chat audio play failed:", e));
  };

  const togglePlay = () => {
    if (!mainAudioRef.current) return;
    if (isPlaying) {
      mainAudioRef.current.pause();
    } else {
      chatAudioRef.current?.pause();
      mainAudioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // 🎯 文字追問：userName 自動交由 API 內部在背景解析，不需在頁面手動讀取與傳遞
  const handleSend = async () => {
    const text = message.trim();
    if (!text) return;
    const userMessage: ChatMessage = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");

    try {
      const data = await analyzeGuideInput({
        text: text, 
        attractionTitle: backendResult?.title || "未知景點", 
        language: currentLang
      });
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: data.guideMessage }]);
      if (data.audioUrl) playChatAudio(data.audioUrl);
    } catch (err: any) {
      console.error("Send message error:", err);
      const backendErrorMsg = err.response?.data?.detail;
      alert(backendErrorMsg || "發送訊息失敗，請稍後再試。");
    }
  };

  // 🎯 語音追問切換：按一下開始錄音，再按一下停止錄音並自動打包送出
  const toggleRecording = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (isRecording) {
      // 停止錄音並觸發 API 送出
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    } else {
      // 開始錄音
      if (mainAudioRef.current) mainAudioRef.current.pause();
      if (chatAudioRef.current) chatAudioRef.current.pause();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          const userMsgId = Date.now();
          setMessages((prev) => [...prev, { id: userMsgId, role: "user", text: translations.voiceSending[currentLang] }]);
          
          try {
            const data = await analyzeGuideInput({
              voice: audioBlob, 
              attractionTitle: backendResult?.title || "未知景點", 
              language: currentLang
            });

            setMessages((prev) =>
              prev.map(msg => msg.id === userMsgId ? { ...msg, text: `🎤 ${data.user_text || "..."}` } : msg)
              .concat({ id: Date.now() + 1, role: "assistant", text: data.guideMessage })
            );
            if (data.audioUrl) playChatAudio(data.audioUrl);
          } catch (err: any) {
            console.error(err);
            const backendErrorMsg = err.response?.data?.detail;
            alert(backendErrorMsg || "語音分析失敗，請稍後再試。");
          }
        };
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert(translations.voiceError[currentLang]);
      }
    }
  };

  const currentTitle = backendResult?.title || "互動導遊解說";
  const currentLocation = backendResult?.location || "渡假村景區";
  const heroImageUrl = getAttractionImage(currentTitle);

  return (
    <main className="guide-result-page" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingBottom: "150px" }}>
      <section 
        className="guide-result-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, var(--dark-slate) 100%), url(${heroImageUrl})`,
          backgroundSize: "cover", backgroundPosition: "center"
        }}
      >
        <button type="button" className="guide-restart-button" onClick={() => navigate("/guide")}>{translations.retake[currentLang]}</button>
        <div className="guide-result-info">
          <h1>{currentTitle}</h1>
          <div className="guide-result-location"><MapPin size={16} /><span>{currentLocation}</span></div>
        </div>
      </section>

      <section className="guide-audio-card">
        <button type="button" className="guide-audio-button" onClick={togglePlay}>{isPlaying ? <Pause size={22} /> : <Play size={22} />}</button>
        <div className="guide-audio-track"><div className="guide-audio-progress" style={{ width: isPlaying ? "85%" : "0%" }} /></div>
      </section>

      <section className="guide-chat-list" style={{ flexGrow: 1, paddingBottom: "20px" }}>
        {messages.map((item) => (
          <div key={item.id} className={item.role === "user" ? "guide-chat-row guide-chat-row-user" : "guide-chat-row guide-chat-row-assistant"}>
            <div className="guide-chat-bubble">{item.text}</div>
          </div>
        ))}
      </section>

      <section className="guide-chat-input-area" style={{ position: "fixed", bottom: "65px", left: 0, width: "100%", zIndex: 99, backgroundColor: "#ffffff" }}>
        <div className="guide-chat-input-wrap">
          <input type="text" placeholder={translations.placeholder[currentLang]} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} />
          
          {/* 麥克風按鈕：單擊 onClick 進行錄音狀態切換 */}
          <button 
            type="button" 
            className={`guide-mic-button ${isRecording ? "recording" : ""}`} 
            onClick={toggleRecording}
          >
            {isRecording ? <Square size={16} style={{ color: "#ef4444" }} /> : <Mic size={18} />}
          </button>
          
          <button type="button" className="guide-send-button" onClick={handleSend} disabled={!message.trim()}><Send size={18} /></button>
        </div>
      </section>
    </main>
  );
}