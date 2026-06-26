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

  // 使用 useRef 來追蹤最新的 selectedDate，避免 useEffect 內 closure 拿到舊日期
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const fetchItinerary = async () => {
    const data = await getExclusiveItinerary();
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    setItineraryList(sortedData);

    if (data.length > 0 && !selectedDate) {
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

    try {
      setIsSubmitting(true);
      setAiStatus("thinking");
      setAiResponse(null);

      // 先停止目前可能正在播放的其他朗讀
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      const result = await submitFeedback(text, selectedDateRef.current);
      if (result.success) {
        setAiStatus("responded");
        setAiResponse(result.message);
        setFeedback("");

        // 🚀 核心邏輯：如果是語音進來的，結果出來後直接念出
        if (isVoice && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(result.message);
          utterance.lang = currentLang === "zh" ? "zh-TW" : "en-US"; 
          window.speechSynthesis.speak(utterance);
        }

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

  // 監聽語音識別的設定
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
        
        // 🚀 核心修改：語音一辨識完，直接把文字丟進 executeSubmit，並標記為語音輸入 (true)
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
          <button className={`mic-button ${isRecording ? "recording" : ""}`} onClick={handleMicClick}>
            <Mic size={18} />
          </button>
          
          {/* 🚀 手動點擊紙飛機送出：判定為純文字模式 (false) */}
          <button 
            className="send-button" 
            onClick={() => executeSubmit(feedback, false)} 
            disabled={isSubmitting || !feedback.trim()}
          >
            <Send size={16} />
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