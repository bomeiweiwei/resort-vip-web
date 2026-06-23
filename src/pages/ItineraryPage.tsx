import { useEffect, useMemo, useState, useRef } from "react";
import { CalendarDays, UserRound, Mic, Send, Sparkles } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { getExclusiveItinerary, submitFeedback } from "../apis/itineraryApi";
import "../styles/Itinerary.css";

import type {
  ItineraryDateGroup,
  ItinerarySchedule,
} from "../types/itinerary";

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
  placeholder: { zh: "輸入調整需求，例如：我想把下午行程延後半小時...", en: "Type your update requests here..." },
  recordingPlaceholder: { zh: "正在聆聽語音中... 請對著麥克風說話...", en: "Listening... Please speak into the mic..." },
  alertFailed: { zh: "意見提交失敗，詳細錯誤請見控制台 (F12)", en: "Submission failed, please check Console (F12)" },
  emptyPrefix: { zh: "此日期沒有符合「", en: "There are no schedules matching \"" },
  emptySuffix: { zh: "」的行程。", en: "\" on this date." },
  aiTitle: { zh: "AI 行程規劃師", en: "AI Itinerary Architect" },
  aiThinking: { zh: "正在為您重新規劃並調整行程安排", en: "Optimizing and adjusting your VIP schedule" },
};

function ItineraryPage() {
  const { currentLang = "zh" } = useOutletContext<{ currentLang: "zh" | "en" }>();
  
  const recognitionRef = useRef<any>(null);

  const [itineraryList, setItineraryList] = useState<ItineraryDateGroup[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPreference, setSelectedPreference] = useState("全部偏好");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "responded">("idle");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchItinerary = async () => {
    const data = await getExclusiveItinerary();

    // 🚀 核心優化：將日期由小到大（舊到新，ASC）進行排序，使越前面的天數顯示在最上面
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    setItineraryList(sortedData);

    if (data.length > 0 && !selectedDate) {
      // 🚀 核心優化：優先預設顯示客戶當前日期行程
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const hasToday = data.some((item) => item.date === todayStr);
      if (hasToday) {
        setSelectedDate(todayStr);
      } else {
        setSelectedDate(data[0].date);
        console.log(`📅 今日無指定行程，預設切換至第一天行程: ${data[0].date}`);
      }
    }
  };

  useEffect(() => {
    fetchItinerary();
  }, []);

  // 確保語言切換時語音設定同步更新
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

  const handleSubmitFeedback = async () => {
    const text = feedback.trim();
    if (!text) return;

    try {
      setIsSubmitting(true);
      setAiStatus("thinking");
      setAiResponse(null);

      const result = await submitFeedback(text, selectedDate);
      if (result.success) {
        setAiStatus("responded");
        setAiResponse(result.message);
        setFeedback("");
        await fetchItinerary();
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
        {filteredSchedules.map((item) => (
          <div key={`${item.time}-${item.title}`} className="timeline-row">
            <div className="timeline-dot" />
            <article className="timeline-card">
              <span className="time-badge">{item.time}</span>
              <h3>{item.title}</h3>
              <p>{item.content}</p>
            </article>
          </div>
        ))}
      </section>

      {/* 整合奢華底部控置台 */}
      <section className="itinerary-feedback">
        {/* 輸入按鈕控制層 */}
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
          <button className="send-button" onClick={() => handleSubmitFeedback()} disabled={isSubmitting || !feedback.trim()}>
            <Send size={16} />
          </button>
        </div>

        {/* AI 回覆卡片區塊 - 透過 CSS flex-direction 反轉，會自動浮現於輸入框上方 */}
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