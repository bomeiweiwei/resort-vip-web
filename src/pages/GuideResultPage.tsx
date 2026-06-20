import { useState, useEffect, useRef } from "react";
import { MapPin, Mic, Pause, Play, Send } from "lucide-react";
import { useLocation, useNavigate, useOutletContext, useInRouterContext, HashRouter } from "react-router-dom";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const translations = {
  retake: { zh: "重拍", en: "Retake" },
  placeholder: { zh: "輸入文字或長按右方錄音...", en: "Type a message or hold mic to record..." },
  voiceSending: { zh: "🎤 [語音訊息處理中...]", en: "🎤 [Processing voice message...]" },
  voiceError: { zh: "無法存取麥克風設備，請確認權限。", en: "Unable to access microphone. Please check permissions." },
  ttsBlock: { zh: "語音自動播放已被阻擋，請手動點擊 Play。", en: "Audio auto-play blocked. Please click play to listen." }
};

// 🎯 景點與代表圖片對照表
const getAttractionImage = (title: string): string => {
  const lowerTitle = (title || "").toLowerCase();
  
  // 1. 溫泉公園木質古亭 / Pavilion
  if (lowerTitle.includes("亭") || lowerTitle.includes("pavilion") || lowerTitle.includes("古亭")) {
    return "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&w=800&q=80"; // 傳統木製涼亭與自然景觀
  }
  // 2. 星空無邊際泳池 / Starry Infinity Pool
  if (lowerTitle.includes("泳池") || lowerTitle.includes("pool")) {
    return "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80"; // 奢華無邊際泳池
  }
  // 3. 迎賓水舞廣場 / Welcome Fountain
  if (lowerTitle.includes("水舞") || lowerTitle.includes("fountain") || lowerTitle.includes("廣場")) {
    return "https://images.unsplash.com/photo-1596131397999-994df5170d9a?auto=format&fit=crop&w=800&q=80"; // 華麗水舞噴泉
  }
  // 4. 秘境森林步道 / Secret Forest Trail / 森林 / 步道
  if (lowerTitle.includes("步道") || lowerTitle.includes("trail") || lowerTitle.includes("森林") || lowerTitle.includes("forest")) {
    return "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80"; // 陽光灑落的森林步道
  }
  // 5. 深海景觀餐廳 / Deep Sea Restaurant
  if (lowerTitle.includes("餐廳") || lowerTitle.includes("restaurant") || lowerTitle.includes("深海")) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"; // 高級景觀餐飲空間
  }
  
  // 預設度假村精緻背景圖
  return "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80";
};

// 🎯 直接在檔案內定義與封裝後端對話 API，免去外部 import 導致的編譯與解析錯誤
const sendGuideChatMessageDirect = async (params: {
  text?: string;
  voice?: Blob;
  attractionTitle: string;
  language: string;
}) => {
  const formData = new FormData();
  formData.append("attraction_title", params.attractionTitle);
  formData.append("language", params.language);

  // 如果使用者輸入了文字
  if (params.text) {
    formData.append("text", params.text);
  }

  // 如果使用者錄製了語音，打包 Blob 並指定檔名
  if (params.voice) {
    formData.append("voice", params.voice, "voice.wav");
  }

  const response = await fetch("/api/guide/chat", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  return await response.json();
};

function GuideResultPageInternal() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const context = useOutletContext<any>();
  const currentLang = (context && typeof context === "object" && context.currentLang === "en") ? "en" : "zh";

  const backendResult = location.state?.analysisResult;
  const initialQuery = location.state?.initialQuery;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // 🎯 隔離主導覽音軌與對話問答音軌
  const [isPlaying, setIsPlaying] = useState(false); // 僅控制「原始剛進畫面時」的主播報按鈕與進度條波浪
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 1. 初始加載：自動播報原始導覽介紹
  useEffect(() => {
    if (!backendResult && !initialQuery) {
      navigate("/guide");
      return;
    }

    if (backendResult) {
      setMessages([{ id: 1, role: "assistant", text: backendResult.guideMessage }]);
      if (backendResult.audioUrl) {
        const fullUrl = backendResult.audioUrl.startsWith("http") ? backendResult.audioUrl : `/api${backendResult.audioUrl}`;
        const audio = new Audio(fullUrl);
        audio.playbackRate = 1.25; // 語速加快 1.25 倍
        mainAudioRef.current = audio;

        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => setIsPlaying(false);

        audio.play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.log(translations.ttsBlock[currentLang], e));
      }
    } else if (initialQuery) {
      setMessages([{ id: Date.now(), role: "user", text: initialQuery }]);
      triggerDirectQuery(initialQuery);
    }

    return () => {
      mainAudioRef.current?.pause();
      chatAudioRef.current?.pause();
    };
  }, [backendResult, initialQuery, navigate]);

  // 對話歷史更新時自動滾動至底部
  useEffect(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  // 播放追問後的對話問答語音（獨立播放器，不影響 mainAudioRef 的狀態）
  const playChatAudio = (url: string) => {
    chatAudioRef.current?.pause();
    
    // 如果對話語音播放時，主動將原始導覽暫停，防止聲音重疊
    if (mainAudioRef.current && !mainAudioRef.current.paused) {
      mainAudioRef.current.pause(); 
    }

    const fullUrl = url.startsWith("http") ? url : `/api${url}`;
    const nextAudio = new Audio(fullUrl);
    nextAudio.playbackRate = 1.25; // 對話語速同步維持 1.25 倍輕快
    chatAudioRef.current = nextAudio;
    nextAudio.play().catch((e) => console.log("Chat audio play failed:", e));
  };

  // 文字初始問題處理（文字問問題 ➡️ 文字回應，不播放語音）
  const triggerDirectQuery = async (queryText: string) => {
    try {
      const data = await sendGuideChatMessageDirect({
        text: queryText,
        attractionTitle: "一般詢問",
        language: currentLang
      });
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: data.reply }]);
    } catch (err) {
      console.error(err);
    }
  };

  // 控制上方原始導覽卡片的「播放/暫停」
  const togglePlay = () => {
    if (!mainAudioRef.current) return;
    if (isPlaying) {
      mainAudioRef.current.pause();
    } else {
      chatAudioRef.current?.pause(); // 播放原始介紹時暫停對話播放
      mainAudioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // 打字發送追問（文字問問題 ➡️ 文字回應，不播放語音，不干擾主卡片狀態）
  const handleSend = async () => {
    const text = message.trim();
    if (!text) return;
    const userMessage: ChatMessage = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");

    try {
      const data = await sendGuideChatMessageDirect({
        text,
        attractionTitle: backendResult?.title || "未知景點",
        language: currentLang
      });
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: data.reply }]);
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  // 語音錄音追問（語音問問題 ➡️ 語音回應，自動播放語音）
  const startRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    // 🎯 核心優化：當按下錄音按鈕時，若上方「原始導覽語音」正在播放，則自動將其暫停
    if (mainAudioRef.current && !mainAudioRef.current.paused) {
      mainAudioRef.current.pause(); // 這會觸發 mainAudio.onpause，進而自動將 isPlaying 設為 false
    }

    // 🎯 核心優化：同時也暫停任何正在播放中的對話語音，避免播放聲音干擾錄音品質
    if (chatAudioRef.current && !chatAudioRef.current.paused) {
      chatAudioRef.current.pause();
    }

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
          const data = await sendGuideChatMessageDirect({
            voice: audioBlob,
            attractionTitle: backendResult?.title || "未知景點",
            language: currentLang
          });

          // 更新使用者語音轉譯出的文字，並追加 AI 的回覆氣泡
          setMessages((prev) =>
            prev.map(msg => msg.id === userMsgId ? { ...msg, text: `🎤 ${data.user_text || "..."}` } : msg)
            .concat({ id: Date.now() + 1, role: "assistant", text: data.reply })
          );
          
          // 語音追問 ➡️ 播放回應語音（透過獨立對話播放器，不干涉/不影響上方主導覽進度條與按鈕）
          if (data.audioUrl) {
            playChatAudio(data.audioUrl);
          }
        } catch (err) {
          console.error(err);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert(translations.voiceError[currentLang]);
    }
  };

  const stopRecording = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const currentTitle = backendResult?.title || (currentLang === "en" ? "Interactive Guide" : "互動導遊解說");
  const currentLocation = backendResult?.location || (currentLang === "en" ? "Resort Area" : "渡假村景區");

  // 🎯 取得當前景點相對應的代表圖片網址
  const heroImageUrl = getAttractionImage(currentTitle);

  return (
    <main className="guide-result-page" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingBottom: "150px" }}>
      {/* 🎯 動態設定上方的景點代表圖片，並疊加暗色漸層確保文字清晰可讀 */}
      <section 
        className="guide-result-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, var(--dark-slate) 100%), url(${heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <button type="button" className="guide-restart-button" onClick={() => navigate("/guide")}>{translations.retake[currentLang]}</button>
        <div className="guide-result-info">
          <h1>{currentTitle}</h1>
          <div className="guide-result-location"><MapPin size={16} /><span>{currentLocation}</span></div>
        </div>
      </section>

      {/* 上方導覽音訊播放卡片：進度條與圖示僅與 isPlaying (原始介紹播報) 綁定 */}
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

      <section className="guide-chat-input-area" style={{ position: "fixed", bottom: "65px", left: 0, width: "100%", zIndex: 99, backgroundColor: "#ffffff", boxShadow: "0 -4px 20px rgba(0,0,0,0.05)" }}>
        <div className="guide-chat-input-wrap">
          <input type="text" placeholder={translations.placeholder[currentLang]} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} />
          <button type="button" className={`guide-mic-button ${isRecording ? "recording" : ""}`} onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}><Mic size={18} /></button>
          <button type="button" className="guide-send-button" onClick={handleSend} disabled={!message.trim()}><Send size={18} /></button>
        </div>
      </section>
    </main>
  );
}

function GuideResultPage() {
  let inRouter = false;
  try { inRouter = useInRouterContext(); } catch (e) { inRouter = false; }
  return inRouter ? <GuideResultPageInternal /> : <HashRouter><GuideResultPageInternal /></HashRouter>;
}

export default GuideResultPage;