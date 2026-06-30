import { useEffect, useMemo, useState, useRef } from "react";
import { CalendarDays, Mic, Send, Sparkles, X, Clock, Tag } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { getExclusiveItinerary, submitFeedback } from "../apis/itineraryApi";
import "../styles/Itinerary.css";

import type {
  ItineraryDateGroup,
  ItineraryScheduleResponse
} from "../types/itinerary";

const uiText = {
  heroTitle: { zh: "專屬行程規劃", en: "Itinerary Planning" },
  heroDesc: { zh: "基於您的入住資訊為您量身打造。", en: "Tailor-made based on your check-in information and preferences." },
  placeholder: { zh: "輸入調整需求", en: "Type your update requests here..." },
  recordingPlaceholder: { zh: "正在聆聽語音中... 請對著麥克風說話...", en: "Listening... Please speak into the mic..." },
  alertFailed: { zh: "意見提交失敗，詳細錯誤請見控制台 (F12)", en: "Submission failed, please check Console (F12)" },
  aiTitle: { zh: "AI 行程規劃師", en: "AI Itinerary Architect" },
  aiThinking: { zh: "正在為您重新規劃並調整行程安排", en: "Optimizing and adjusting your VIP schedule" },
};

const getStaticUrl = (url?: string) => {
  const apiBaseUrl = import.meta.env.VITE_PROXY_API;
  if (!url) return `${apiBaseUrl}/static/images/empty.png`;
  if (url.startsWith("http")) return url;
  return `${apiBaseUrl}${url}`;
};

function ItineraryPage() {
  const { currentLang = "zh" } = useOutletContext<{ currentLang: "zh" | "en" }>();
  const recognitionRef = useRef<any>(null);
  
  // 控制目前播放中的音訊物件，防範新舊語音重疊
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [itineraryList, setItineraryList] = useState<ItineraryDateGroup[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "responded">("idle");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // 儲存當前點開看完整行程內容的物件
  const [activeDetailItem, setActiveDetailItem] = useState<ItineraryScheduleResponse | null>(null);

  // 🚀 使用 useRef 追蹤 selectedDate 以防非同步 closure 讀到舊值
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // 載入行程列表時允許指定 targetDate 來保持目前編輯的日期
  const fetchItinerary = async (targetDate?: string) => {
    const data = await getExclusiveItinerary();
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    setItineraryList(sortedData);

    if (sortedData.length > 0) {
      // 優先順序：1. 剛剛修改保留的日期 -> 2. 當前選取的日期 -> 3. 今天 -> 4. 行程第一天
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

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // 使用傳入的 targetDate 準確對接後端
      const result = await submitFeedback(text, targetDate);
      
      if (result.success) {
        setAiStatus("responded");
        setAiResponse(result.message);
        setFeedback("");

        if (result.audio_base64) {
          try {
            console.log("🔊 收到專屬管家語音，準備播放...");
            const audioUrl = `data:audio/mp3;base64,${result.audio_base64}`;
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            await audio.play();
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

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = currentLang === "zh" ? "zh-TW" : "en-US";
      recognitionRef.current.continuous = false; 
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setFeedback(transcript); 
        setIsRecording(false);
        
        // 🚀 核心 Bug 修正：語音辨識結束自動發送時，使用 selectedDateRef.current 傳參
        // 💡 如此一來，即可百分之百抓到當前選取的最新日期（例如 6/18），徹底避免因閉包過期而發送空字串致使日期跑掉的問題！
        executeSubmit(transcript, selectedDateRef.current);
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
                  src={getStaticUrl(item.imageUrl)}
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
                  <span className="preference-tag alignment-right">{item.preference}</span>
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
          <button className={`mic-button ${isRecording ? "recording" : ""}`} onClick={handleMicClick}>
            <Mic size={18} />
          </button>
          
          <button className="send-button" onClick={() => executeSubmit(feedback, selectedDate)} disabled={isSubmitting || !feedback.trim()}>
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
              <img src={getStaticUrl(activeDetailItem.imageUrl)} alt={activeDetailItem.title} className="modal-hero-image" />
            </div>

            {/* 下方無刪減完整資訊 */}
            <div className="modal-detail-body">
              <div className="modal-meta-row">
                <div className="modal-meta-badge time"><Clock size={14} /><span>{activeDetailItem.time}</span></div>
                <div className="modal-meta-badge pref"><Tag size={14} /><span>{activeDetailItem.preference}</span></div>
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