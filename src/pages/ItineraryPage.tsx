import { useEffect, useMemo, useState, useRef } from "react";
import { CalendarDays, UserRound, Mic, Send, Sparkles } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { getExclusiveItinerary, submitFeedback } from "../apis/itineraryApi";
import "../styles/Itinerary.css";

import type { ItineraryDateGroup } from "../types/itinerary";

// 篩選偏好
const preferenceOptions = [
  { value: "全部偏好", label: { zh: "全部偏好", en: "All Preferences" } },
  { value: "觀光園區", label: { zh: "觀光園區", en: "Theme Park" } },
  { value: "在地文化", label: { zh: "在地文化", en: "Local Culture" } },
  { value: "餐飲美食", label: { zh: "餐飲美食", en: "Dining & Food" } },
  { value: "溫泉公園", label: { zh: "溫泉公園", en: "Hot Spring" } },
];

// 多國語言
const uiText = {
  heroTitle: { zh: "專屬行程規劃", en: "Itinerary Planning" },
  heroDesc: { zh: "基於您的入住資訊與喜好，為您量身打造。", en: "Tailor-made based on your check-in information and preferences." },
  placeholder: { zh: "輸入調整需求...", en: "Type your update requests here..." },
  recordingPlaceholder: { zh: "正在聆聽語音中... 請對著麥克風說話...", en: "Listening... Please speak into the mic..." },
  alertFailed: { zh: "意見提交失敗", en: "Submission failed" },
  emptyPrefix: { zh: "此日期沒有符合「", en: "There are no schedules matching \"" },
  emptySuffix: { zh: "」的行程。", en: "\" on this date." },
  aiTitle: { zh: "AI 行程規劃師", en: "AI Itinerary Architect" },
  aiThinking: { zh: "正在為您重新規劃並調整行程安排", en: "Optimizing and adjusting your VIP schedule" },
};

function ItineraryPage() {
  const { currentLang = "zh" } = useOutletContext<{ currentLang: "zh" | "en" }>();
  
  const recognitionRef = useRef<any>(null);
  // 用於追蹤與控制當前正在播放的音訊物件，防止聲音重疊
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [itineraryList, setItineraryList] = useState<ItineraryDateGroup[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPreference, setSelectedPreference] = useState("全部偏好");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "responded">("idle");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 使用 useRef 來追蹤最新的 selectedDate，避免 useEffect 內 closure 拿到舊日期
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // 🚀 核心修改：超強效智慧配圖與容錯機制
  const getItineraryImage = (item: any) => {
    // 1. 優先相容 API / SQL 的蛇型命名 (image_url) 與前端駝峰命名 (imageUrl)
    const originalImg = item.imageUrl || item.image_url;
    
    // 2. 🛡️ 容錯防護：排除資料庫在 NULL 時可能被 stringify 成 "null"、"undefined" 或空字串的狀況
    if (
      originalImg && 
      typeof originalImg === "string" && 
      originalImg.trim() !== "" && 
      originalImg !== "null" && 
      originalImg !== "undefined"
    ) {
      return originalImg;
    }

    // 3. 🧠 語意分析關鍵字配圖：當 AI 產生新行程時，通常不會有圖片 URL，我們用關鍵字進行極其精準的情境圖匹配
    const title = (item.title || "").toLowerCase();
    const content = (item.content || "").toLowerCase();
    const pref = (item.preference || "").trim();

    // 溫泉、湯屋、SPA
    if (
      title.includes("溫泉") || title.includes("spa") || title.includes("湯屋") || title.includes("泡湯") || title.includes("泉") ||
      content.includes("溫泉") || content.includes("spa") || content.includes("湯屋") || content.includes("泡湯")
    ) {
      return "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80";
    }

    // 餐飲、美食、早餐、料理
    if (
      title.includes("餐") || title.includes("食") || title.includes("飲") || title.includes("酒") || 
      title.includes("早") || title.includes("午") || title.includes("晚") || title.includes("饗宴") || 
      title.includes("料理") || title.includes("咖啡") ||
      content.includes("餐") || content.includes("美食") || content.includes("料理") || content.includes("吃")
    ) {
      return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80";
    }

    // 傳統、文化、手作、體驗、工坊、職人
    if (
      title.includes("文化") || title.includes("手作") || title.includes("體驗") || title.includes("工坊") || 
      title.includes("歷史") || title.includes("職人") || title.includes("傳統") || title.includes("編織") ||
      content.includes("文化") || content.includes("手作") || content.includes("體驗") || content.includes("歷史")
    ) {
      return "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=600&q=80";
    }

    // 觀光、樂園、森林、公園、園區、景點、巡遊
    if (
      title.includes("樂園") || title.includes("公園") || title.includes("觀光") || title.includes("遊") || 
      title.includes("探索") || title.includes("森林") || title.includes("園區") || title.includes("滑索") ||
      content.includes("樂園") || content.includes("景點") || content.includes("園區") || content.includes("遊覽")
    ) {
      return "https://images.unsplash.com/photo-1513829096999-4978602294fc?auto=format&fit=crop&w=600&q=80";
    }

    // 4. 🗂️ 分類兜底配圖 (防範資料庫 NCHAR/CHAR 類型的空格 Padding 問題，加上 trim() 處理)
    const fallbackCategoryImages: Record<string, string> = {
      "餐飲美食": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80",
      "在地文化": "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=600&q=80",
      "溫泉公園": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
      "觀光園區": "https://images.unsplash.com/photo-1513829096999-4978602294fc?auto=format&fit=crop&w=600&q=80",
      "其他": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
    };

    return fallbackCategoryImages[pref] || fallbackCategoryImages["其他"];
  };

  // 🚀 允許傳入指定的 targetDate 來在載入後強制維持該日期，避免重新渲染時跳掉
  const fetchItinerary = async (targetDate?: string) => {
    const data = await getExclusiveItinerary();
    console.log("👉 這是後端吐給前端的真實資料：", data);

    // 🚀 核心安全過濾：將所有來自後端的日期字串規格化為 YYYY-MM-DD，防範 SQL Server datetime 格式不一致（例如包含 00:00:00）導致比對失敗
    const sortedData = [...data].map(item => {
      const cleanDate = item.date.includes(" ") 
        ? item.date.split(" ")[0] 
        : item.date.includes("T") 
          ? item.date.split("T")[0] 
          : item.date;
      return { ...item, date: cleanDate };
    }).sort((a, b) => a.date.localeCompare(b.date));

    setItineraryList(sortedData);

    if (sortedData.length > 0) {
      // 🚀 優先順序：1. 明確指定的目標日期 (剛編輯完保留) -> 2. 當前選取的日期 -> 3. 今天 -> 4. 行程第一天
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

  // 🚀 核心重構：抽離成一個共用的送出 Function，並加入 isVoice 參數控制是否要語音回覆
  const executeSubmit = async (textToSend: string, isVoice: boolean) => {
    const text = textToSend.trim();
    if (!text) return;

    // 🚀 關鍵鎖定：在發送非同步請求前，先牢牢記下使用者「當下正在修改的日期」
    const dateToPreserve = selectedDateRef.current;

    try {
      setIsSubmitting(true);
      setAiStatus("thinking");
      setAiResponse(null);

      // 1. 🛡️ 停止目前可能正在播放的任何音訊（包含 HTML5 Audio 與 Web Speech）
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      // 2. 呼叫後端 API（後端 itinerary_service 的 submit_feedback 會返回 audio_base64）
      const result = await submitFeedback(text, dateToPreserve);
      
      if (result.success) {
        setAiStatus("responded");
        setAiResponse(result.message);
        setFeedback("");

        // 3. 🎙️ 語音導覽播放邏輯：優先採用高擬真 Base64 MP3 音訊
        if (result.audio_base64) {
          try {
            console.log("🔊 正在播放由 Google TTS 產出的管家語音音訊...");
            const audioUrl = `data:audio/mp3;base64,${result.audio_base64}`;
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            await audio.play();
          } catch (audioError) {
            console.warn("⚠️ 瀏覽器阻擋了自動語音播放，需要使用者點擊互動後才能播放。", audioError);
          }
        } 
        // 4. 📉 降級備用：如果後端未生成語音但又是語音輸入，降級使用本地 Web Speech 朗讀
        else if (isVoice && "speechSynthesis" in window) {
          console.log("🔊 降級使用本地 Web Speech API 朗讀...");
          const utterance = new SpeechSynthesisUtterance(result.message);
          utterance.lang = currentLang === "zh" ? "zh-TW" : "en-US"; 
          window.speechSynthesis.speak(utterance);
        }

        // 🚀 5. 核心修改：重新整理行程時，強制傳入當初修改的日期，使其維持在該日期頁面，解決跳頁問題
        await fetchItinerary(dateToPreserve);
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

  // 監聽語音識別的設定
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      // 🚀 修正：回復為正確的原生 SpeechRecognition 構造函數，避免 Recognition 未定義報錯
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = currentLang === "zh" ? "zh-TW" : "en-US";
      recognitionRef.current.continuous = false; 
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setFeedback(transcript); 
        setIsRecording(false);
        
        // 🚀 語音一辨識完，直接把文字丟進 executeSubmit，並標記為語音輸入 (true)
        executeSubmit(transcript, true);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        setToastMsg("語音識別失敗，請再試一次");
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [currentLang]);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      alert("您的瀏覽器不支援語音輸入功能 (請使用 Chrome 或 Edge)");
      return;
    }

    if (!isRecording) {
      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      setIsRecording(false);
      recognitionRef.current.stop();
    }
  };

  const selectedDateGroup = useMemo(() => itineraryList.find((item) => item.date === selectedDate), [itineraryList, selectedDate]);
  const filteredSchedules = useMemo(() => {
    const schedules = selectedDateGroup?.schedules ?? [];
    return selectedPreference === "全部偏好" ? schedules : schedules.filter((item) => item.preference === selectedPreference);
  }, [selectedDateGroup, selectedPreference]);

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

          <label className="itinerary-filter">
            <UserRound size={18} />
            <select value={selectedPreference} onChange={(e) => setSelectedPreference(e.target.value)}>
              {preferenceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label[currentLang]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="timeline">
        {filteredSchedules.map((item) => {
          // 🚀 呼叫智慧配圖邏輯，保障無論原圖路徑大小寫、或是新行程，皆能顯示最完美的封面照
          const displayImage = getItineraryImage(item);
          return (
            <div key={`${item.time}-${item.title}`} className="timeline-row">
              <div className="timeline-dot" />
              
              <article className={`timeline-card with-cover ${displayImage ? "has-img" : ""}`}>
                {/* 上半部：純大圖封面 */}
                {displayImage && (
                  <div className="timeline-cover">
                    <img src={displayImage} alt={item.title} loading="lazy" />
                  </div>
                )}
                
                {/* 下半部：文字內容區 */}
                <div className="timeline-body">
                  <span className="time-badge">{item.time}</span>
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                </div>
              </article>
            </div>
          );
        })}
      </section>

      {/* 整合奢華底部控制台 */}
      <section className="itinerary-feedback">
        <div className="feedback-input-wrap">
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={isRecording ? uiText.recordingPlaceholder[currentLang] : uiText.placeholder[currentLang]}
            disabled={isSubmitting}
            className={isRecording ? "listening-placeholder" : ""}
          />
          <button 
            className={`mic-button ${isRecording ? "recording" : ""}`} 
            onClick={handleMicClick}
            disabled={isSubmitting}
          >
            <Mic size={18} />
          </button>
          
          <button 
            className="send-button" 
            onClick={() => executeSubmit(feedback, false)} 
            disabled={isSubmitting || !feedback.trim()}
          >
            {isSubmitting ? (
              <Sparkles size={16} className="ai-spin text-amber-500" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>

        {/* AI 回覆卡片區塊 */}
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
    </div>
  );
}

export default ItineraryPage;