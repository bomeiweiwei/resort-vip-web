import { useEffect, useMemo, useState, useRef } from "react";
import { CalendarDays, Mic, Send, Sparkles, X, Clock, Tag } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { getExclusiveItinerary, submitFeedback } from "../apis/itineraryApi";
import "../styles/Itinerary.css";

import type {
  ItineraryDateGroup,
  ItinerarySchedule
} from "../types/itinerary";

const uiText = {
  heroTitle: { zh: "專屬行程規劃", en: "Itinerary Planning" },
  heroDesc: { zh: "基於您的入住資訊為您量身打造。", en: "Tailor-made based on your check-in information and preferences." },
  placeholder: { zh: "輸入調整需求", en: "Long press the recording to choose a language..." },
  recordingPlaceholder: { zh: "正在聆聽語音中... ", en: "Listening..." },
  alertFailed: { zh: "意見提交失敗，詳細錯誤請見控制台 (F12)", en: "Submission failed, please check Console (F12)" },
  aiTitle: { zh: "AI 行程規劃師", en: "AI Itinerary Architect" },
  aiThinking: { zh: "正在為您重新規劃並調整行程安排", en: "Optimizing and adjusting your VIP schedule" },
};

// 🚀 新增：分類標籤的多國語言字典
const preferenceTranslation: Record<string, { zh: string; en: string }> = {
  "觀光園區": { zh: "觀光園區", en: "Attractions" },
  "在地文化": { zh: "在地文化", en: "Local Culture" },
  "餐飲美食": { zh: "餐飲美食", en: "Dining" },
  "溫泉公園": { zh: "溫泉公園", en: "Hot Springs" },
  "其他": { zh: "其他", en: "Others" }
};

// 🚀 新增：安全獲取翻譯標籤的 Helper 函式
const getTranslatedPreference = (pref: string, lang: "zh" | "en") => {
  // 如果在字典裡有找到對應的翻譯，就回傳該語系版本；如果找不到（例如意外的髒資料），就原樣顯示
  return preferenceTranslation[pref]?.[lang] || pref;
};

const getStaticUrl = (url?: string) => {
  let apiBaseUrl = "";
  try {
    apiBaseUrl = (new Function("return import.meta.env.VITE_PROXY_API")()) || "";
  } catch (e) {
    apiBaseUrl = "";
  }
  if (!url) return `${apiBaseUrl}/static/images/empty.png`;
  if (url.startsWith("http")) return url;
  return `${apiBaseUrl}${url}`;
};

function ItineraryPage() {
  const { currentLang = "zh" } = useOutletContext<{ currentLang: "zh" | "en" }>();
  
  // 🚀 recognitionRef 現在僅用來存放「當前活動中」的辨識對象，方便隨時強制中止
  const recognitionRef = useRef<any>(null);
  
  // 🚀 控制目前播放中的音訊物件，此 Ref 指向的 HTMLAudioElement 將永久復用，絕對不銷毀
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [itineraryList, setItineraryList] = useState<ItineraryDateGroup[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "responded">("idle");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // 🚀 智慧語音語系狀態：預設繁體中文，切換為英文介面時將啟用長按切換
  const [speechLang, setSpeechLang] = useState("zh-TW");

  // 🚀 長按選單顯示狀態與計時器管理
  const [showLangMenu, setShowLangMenu] = useState(false);
  const longPressTimer = useRef<any>(null);
  const isLongPressed = useRef(false);

  const [activeDetailItem, setActiveDetailItem] = useState<ItinerarySchedule | null>(null);

  // 🚀 使用 useRef 追蹤 selectedDate 以防非同步 closure 讀到舊值
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // 🚀 當切換介面語系時，智慧初始化預設的語音辨識語言
  useEffect(() => {
    if (currentLang === "zh") {
      setSpeechLang("zh-TW");
    } else {
      setSpeechLang("en-US"); // 英文介面時預設辨識英文
    }
  }, [currentLang]);

  // 🚀 點擊頁面其他空白處時自動關閉語系選單
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowLangMenu(false);
    };
    if (showLangMenu) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [showLangMenu]);

  // 🚀 iOS 專屬：使用者觸發事件同步解鎖 Audio 播放通道
  const initAndUnlockIOSAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    
    // 如果目前音訊正處於暫停或尚未載入狀態，注入靜音 Wav 進行解鎖
    if (audio.paused) {
      audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
      audio.play()
        .then(() => {
          audio.pause(); // 播放成功後立刻暫停，等待真實語音 base64 寫入
          console.log("📱 [iOS 語音防禦] 成功提前解鎖 iOS WebKit 音訊通道！");
        })
        .catch((e) => {
          console.warn("⚠️ [iOS 語音防禦] 語音通道預解鎖失敗:", e);
        });
    }
  };

  // 載入行程列表時允許指定 targetDate 來保持目前編輯的日期
  const fetchItinerary = async (targetDate?: string) => {
    const data = await getExclusiveItinerary();
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    setItineraryList(sortedData);

    if (sortedData.length > 0) {
      const activeDate = targetDate || selectedDateRef.current;
      const hasActiveDate = sortedData.some((item) => item.date === activeDate);

      if (activeDate && hasActiveDate) {
        setSelectedDate(activeDate);
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const hasToday = sortedData.some((item) => item.date === todayStr);
        if (hasToday) {
          setSelectedDate(todayStr);
        } else {
          setSelectedDate(sortedData[0].date);
        }
      }
    }
  };

  useEffect(() => {
    fetchItinerary();
  }, []);

  // 核心重構：封裝共用提交邏輯（支援手動點擊或語音自動發送）
  const executeSubmit = async (textToSend: string, targetDate: string) => {
    const text = textToSend.trim();
    if (!text) return;

    try {
      setIsSubmitting(true);
      setAiStatus("thinking");
      setAiResponse(null);

      // 🚀 核心優化：只暫停音訊，絕不將 audioRef.current 設為 null！
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (e) {
          console.warn("暫停現有播放失敗:", e);
        }
      }

      // 使用傳入的 targetDate 準確對接後端
      const result = await submitFeedback(text, targetDate, speechLang);
      
      if (result.success) {
        setAiStatus("responded");
        setAiResponse(result.message);
        setFeedback("");

        if (result.audio_base64) {
          try {
            console.log("🔊 收到專屬管家語音，準備播放...");
            const audioUrl = `data:audio/mp3;base64,${result.audio_base64}`;

            if (!audioRef.current) {
              audioRef.current = new Audio();
            }
            
            const audio = audioRef.current;
            audio.src = audioUrl; // 僅抽換音訊來源，完美繞過 iOS 的嚴格防禦！
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              await playPromise;
            }

          } catch (audioError) {
            console.warn("⚠️ 瀏覽器阻擋了自動語音播放，等待使用者點擊頁面互動後播放。", audioError);
          }
        }

        // 成功後強制重新整理並切換到該目標日期，維持狀態不跳頁
        await fetchItinerary(targetDate);
        setSelectedDate(targetDate); 

      } else {
        alert(result.message);
        setAiStatus("idle");
      }
    } catch (error) {
      setToastMsg(uiText.alertFailed[currentLang]);
      setAiStatus("idle");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      
      if (isIOS) {
        alert(currentLang === "zh"
          ? "💡 專屬管家貼心提示：\n由於 iOS 系統安全規範限制，第三方瀏覽器 (如 Chrome、Edge、LINE 內置瀏覽器) 無法開啟網頁語音辨識。\n\n請複製本網頁連結，改用 iOS 內建的「Safari 瀏覽器」開啟，即可完美體驗尊榮語音對話功能！"
          : "💡 Royal Concierge Alert:\nDue to iOS system privacy settings, third-party browsers (such as Chrome, Edge, or LINE) cannot access Web Speech API.\n\nPlease copy this link and open it in native 'Safari Browser' to unlock the voice planning feature!"
        );
      } else {
        alert(currentLang === "zh"
          ? "您的瀏覽器暫不支援語音輸入功能 (建議使用 Chrome, Edge 或 Safari 瀏覽器)"
          : "Your browser does not support speech recognition (please use Chrome, Edge, or Safari)"
        );
      }
      return;
    }

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
        audioRef.current.load();
      } catch (e) {
        console.warn("釋放音訊硬體鎖失敗", e);
      }
    }

    initAndUnlockIOSAudio();

    if (!isRecording) {
      const rec = new SpeechRecognition();
      rec.lang = speechLang;
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsRecording(true);
        console.log(`🎤 語音辨識服務已成功啟動，目前偵聽語系：${speechLang}`);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setFeedback(transcript); 
        setIsRecording(false);
        // executeSubmit(transcript, selectedDateRef.current);
        executeSubmit(transcript, selectedDateRef.current);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsRecording(false);
        if (e.error === "not-allowed") {
          setToastMsg(currentLang === "zh" ? "請確保已開啟瀏覽器麥克風權限" : "Please enable microphone permission");
        } else {
          setToastMsg(currentLang === "zh" ? "語音識別失敗，請再試一次" : "Speech recognition failed, please try again");
        }
      };
      
      rec.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = rec;

      try {
        rec.start();
      } catch (err) {
        console.error("語音辨識啟動失敗:", err);
        setIsRecording(false);
        recognitionRef.current = null;
      }
    } else {
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.warn("手動中斷語音失敗", err);
        }
        recognitionRef.current = null;
      }
    }
  };

  // 🚀 Pointer 下壓事件（相容於桌面滑鼠下壓與行動端觸控下壓）
  const handlePointerDown = (e: React.PointerEvent) => {
    isLongPressed.current = false;
    
    // 只在英文介面下啟用長按切換語系選單
    if (currentLang === "en") {
      longPressTimer.current = setTimeout(() => {
        isLongPressed.current = true;
        setShowLangMenu(true);
        
        // 如果裝置支援，觸發輕微震動回饋 (Haptic) 提高奢華互動感
        if (navigator.vibrate) {
          try {
            navigator.vibrate(50);
          } catch(e) {}
        }
      }, 600); // 🚀 600ms 定義為精準長按
    }
  };

  // 🚀 Pointer 抬起或離開事件
  const handlePointerUpOrLeave = (e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // 🚀 麥克風點擊防誤觸邏輯
  const handleMicClick = (e: React.MouseEvent) => {
    // 🌟 如果剛剛觸發了長按彈出選單，則直接阻擋本次 Click 事件，防止意外啟動錄音
    if (isLongPressed.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressed.current = false;
      return;
    }
    
    // 正常單擊，啟動/暫停錄音
    startVoiceRecording();
  };

  const selectedDateGroup = useMemo(() => itineraryList.find((item) => item.date === selectedDate), [itineraryList, selectedDate]);
  const filteredSchedules = useMemo(() => selectedDateGroup?.schedules ?? [], [selectedDateGroup]);

  return (
    <div className={`itinerary-page ${aiStatus !== "idle" ? "with-ai-card" : ""}`}>
      {toastMsg && <div className="luxury-toast"><Sparkles size={16} /><span>{toastMsg}</span></div>}

      <section className="itinerary-hero">
        <h2>{uiText.heroTitle[currentLang]}</h2>
        <p>{uiText.heroDesc[currentLang]}</p>
        <div className="itinerary-filters">
          <label className="itinerary-filter">
            <CalendarDays size={18} />
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
              {itineraryList.map((item) => <option key={item.date} value={item.date}>{item.date}</option>)}
            </select>
          </label>
        </div>
      </section>

      {/* 橫式卡片排版線路 */}
      <section className="timeline">
        {filteredSchedules.map((item) => (
          <div key={`${item.time}-${item.title}`} className="timeline-row">
            <div className="timeline-dot" />

            <article className="timeline-card luxury-horizontal" onClick={() => setActiveDetailItem(item)}>
              {/* 左側圖片 */}
              <div className="timeline-card-img-wrap">
                <img
                  className="timeline-card-image"
                  src={getStaticUrl(item.imageUrl || item.image_url)}
                  alt={item.title}
                />
                <div className="img-hover-overlay">
                  <Sparkles size={14} />
                </div>
              </div>

              {/* 右側文字內容 */}
              <div className="timeline-card-body">
                <div className="card-body-header">
                  <span className="time-badge">{item.time}</span>
                  <span className="preference-tag alignment-right">
                    {getTranslatedPreference(item.preference, currentLang)}
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p className="line-truncated-content text-muted-small">{item.content}</p>
              </div>
            </article>
          </div>
        ))}
      </section>

      {/* 整合奢華底部控置台 */}
      <section className="itinerary-feedback">
        <div className="feedback-input-wrap">
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={isRecording ? uiText.recordingPlaceholder[currentLang] : uiText.placeholder[currentLang]}
            disabled={isSubmitting}
            className={isRecording ? "listening-placeholder" : ""}
          />

          {/* 🎙️ 🌟 麥克風與長按語系選單高質感元件 */}
          <div className="mic-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className={`mic-button ${isRecording ? "recording" : ""}`} 
              onClick={handleMicClick}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUpOrLeave}
              onPointerLeave={handlePointerUpOrLeave}
              style={{ touchAction: "none" }} // 🚀 阻擋 iOS 系統預設觸控回饋行為，使 PointerEvent 更靈敏
            >
              <Mic size={18} />
            </button>

            {/* 🚀 長按麥克風彈出的語系選擇選單 (Popover Menu) */}
            {currentLang === "en" && (
              <div className={`lang-popover-menu ${showLangMenu ? "show" : ""}`}>
                <button 
                  className={`lang-popover-item ${speechLang === "en-US" ? "active" : ""}`}
                  onClick={() => {
                    setSpeechLang("en-US");
                    setShowLangMenu(false);
                  }}
                >
                  EN
                </button>
                <button 
                  className={`lang-popover-item ${speechLang === "ja-JP" ? "active" : ""}`}
                  onClick={() => {
                    setSpeechLang("ja-JP");
                    setShowLangMenu(false);
                  }}
                >
                  JP
                </button>
                <button 
                  className={`lang-popover-item ${speechLang === "ko-KR" ? "active" : ""}`}
                  onClick={() => {
                    setSpeechLang("ko-KR");
                    setShowLangMenu(false);
                  }}
                >
                  KR
                </button>
              </div>
            )}
          </div>
          
          <button 
            className="send-button" 
            onClick={() => executeSubmit(feedback, selectedDate)} 
            disabled={isSubmitting || !feedback.trim()}
          >
            <Send size={16} />
          </button>
        </div>

        {aiStatus !== "idle" && (
          <div className="ai-response-area">
            <div className="ai-header">
              <span className="ai-icon-wrapper">
                <Sparkles size={16} className={aiStatus === "thinking" ? "ai-spin" : ""} />
              </span>
              <span>{uiText.aiTitle[currentLang]}</span>
            </div>
            <div className="ai-body">
              {aiStatus === "thinking" ? (
                <div className="ai-thinking-dots">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="thinking-text">{uiText.aiThinking[currentLang]}</span>
                </div>
              ) : (
                <span>{aiResponse}</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 頂級沉浸式行程完整內容彈窗 (Modal) */}
      {activeDetailItem && (
        <div className="luxury-lightbox-overlay" onClick={() => setActiveDetailItem(null)}>
          <div className="luxury-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setActiveDetailItem(null)}>
              <X size={20} />
            </button>
            
            {/* 上方完整滿版大圖 */}
            <div className="modal-hero-img-wrap">
              <img src={getStaticUrl(activeDetailItem.imageUrl || activeDetailItem.image_url)} alt={activeDetailItem.title} className="modal-hero-image" />
            </div>

            {/* 下方無刪減完整資訊 */}
            <div className="modal-detail-body">
              <div className="modal-meta-row">
                <div className="modal-meta-badge time"><Clock size={14} /><span>{activeDetailItem.time}</span></div>
                <div className="modal-meta-badge pref"><Tag size={14} /><span>{getTranslatedPreference(activeDetailItem.preference, currentLang)}</span></div>
              </div>
              <h2>{activeDetailItem.title}</h2>
              <div className="modal-full-content">
                <p>{activeDetailItem.content}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItineraryPage;