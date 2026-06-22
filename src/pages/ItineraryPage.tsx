import { useEffect, useMemo, useState } from "react";
import { CalendarDays, UserRound, Mic, Send } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { getExclusiveItinerary, submitFeedback } from "../apis/itineraryApi";
import "../styles/Itinerary.css";

import type {
  ItineraryDateGroup,
  ItinerarySchedule,
} from "../types/itinerary";

// 下拉選單選項：中英雙語結構
const preferenceOptions = [
  { value: "全部偏好", label: { zh: "全部偏好", en: "All Preferences" } },
  { value: "觀光園區", label: { zh: "觀光園區", en: "Theme Park" } },
  { value: "在地文化", label: { zh: "在地文化", en: "Local Culture" } },
  { value: "餐飲美食", label: { zh: "餐飲美食", en: "Dining & Food" } },
  { value: "溫泉公園", label: { zh: "溫泉公園", en: "Hot Spring" } },
];

// UI 靜態文字的翻譯字典
const uiText = {
  heroTitle: { zh: "專屬行程規劃", en: "Itinerary Planning" },
  heroDesc: { zh: "基於您的入住資訊與喜好，為您量身打造。", en: "Tailor-made based on your check-in information and preferences." },
  feedbackTitle: { zh: "行程修改意見", en: "Itinerary Revision Requests" },
  placeholder: { zh: "輸入訊息或按住錄音", en: "Type or hold to record" },
  alertFailed: { zh: "送出失敗", en: "Submission failed" },
  emptyPrefix: { zh: "此日期沒有符合「", en: "There are no schedules matching \"" },
  emptySuffix: { zh: "」的行程。", en: "\" on this date." },
};

function ItineraryPage() {
  const { currentLang = "zh" } = useOutletContext<{ currentLang: "zh" | "en" }>();

  // 狀態管理
  const [itineraryList, setItineraryList] = useState<ItineraryDateGroup[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPreference, setSelectedPreference] = useState("全部偏好");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // AI 智慧助理回覆狀態管理
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "responded">("idle");

  // 載入專屬行程
  useEffect(() => {
    const loadItinerary = async () => {
      try {
        const data = await getExclusiveItinerary();
        setItineraryList(data);
        if (data && data.length > 0) {
          setSelectedDate(data[0].date);
        }
      } catch (error) {
        console.error("Failed to load itinerary:", error);
      }
    };
    loadItinerary();
  }, []);

  // 取得選定日期的行程群組
  const selectedDateGroup = useMemo(() => {
    return itineraryList.find((item) => item.date === selectedDate);
  }, [itineraryList, selectedDate]);

  // 根據偏好篩選後的行程清單
  const filteredSchedules: ItinerarySchedule[] = useMemo(() => {
    const schedules = selectedDateGroup?.schedules ?? [];
    if (selectedPreference === "全部偏好") {
      return schedules;
    }
    return schedules.filter((item) => item.preference === selectedPreference);
  }, [selectedDateGroup, selectedPreference]);

  // 語音錄音控制邏輯：單擊開始錄音，再次單擊送出
  const handleMicClick = async () => {
    if (!isRecording) {
      setIsRecording(true);
      console.log("Recording started (clicked once)...");
    } else {
      setIsRecording(false);
      console.log("Recording ended (clicked again). Submitting audio...");
      
      // 模擬將錄音結果轉為文字並直接自動送出
      const voiceText = currentLang === "zh" 
        ? "[語音] 幫我把行程中的午餐往後延半小時" 
        : "[Voice] Please delay the lunch schedule by 30 minutes";

      try {
        setIsSubmitting(true);
        setAiStatus("thinking");
        const result = await submitFeedback(voiceText);
        if (result.success) {
          console.log(result.message);
          
          // 模擬 AI 生成奢華度假村助理專屬修正意見
          setTimeout(() => {
            setAiStatus("responded");
            setAiResponse(currentLang === "zh"
              ? "✨ 好的，已為您將「番割田甕缸雞」的用餐時間調整為 13:30，並自動調順後續溫泉與散策之交通接駁。"
              : "✨ Sure! I have moved the lunch at 'Roast Chicken Restaurant' to 1:30 PM, and adjusted your subsequent hot spring and walking session."
            );
          }, 1500);
        }
      } catch (error) {
        console.error(error);
        alert(uiText.alertFailed[currentLang]);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // 送出文字意見邏輯
  const handleSubmitFeedback = async () => {
    const text = feedback.trim();
    if (!text) return;

    try {
      setIsSubmitting(true);
      setAiStatus("thinking");
      const result = await submitFeedback(text);
      if (result.success) {
        console.log(result.message);
        setFeedback("");

        // 模擬 AI 生成奢華度假村助理專屬修正意見
        setTimeout(() => {
          setAiStatus("responded");
          setAiResponse(currentLang === "zh"
            ? `✨ 已收到您的需求「${text}」。已將第一站兒童遊戲區時間微調，預估避開中午艷陽時段，讓您的體驗更加舒適。`
            : `✨ Received: "${text}". I have slightly adjusted the park schedule to avoid the peak noon heat.`
          );
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      alert(uiText.alertFailed[currentLang]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 套用 AI 的修正意見 (模擬重新讀取或通知使用者)
  const handleApplyAiSuggestion = () => {
    setAiStatus("idle");
    setAiResponse(null);
    console.log("AI Suggestion applied successfully!");
  };

  // 取得當前篩選偏好的翻譯標籤
  const selectedPreferenceLabel =
    preferenceOptions.find((item) => item.value === selectedPreference)
      ?.label[currentLang] ?? (currentLang === "zh" ? "全部偏好" : "All Preferences");

  return (
    <div className="itinerary-page">
      {}
      {/* 頂部篩選區域 */}
      <section className="itinerary-hero">
        <h2>{uiText.heroTitle[currentLang]}</h2>
        <p>{uiText.heroDesc[currentLang]}</p>

        <div className="itinerary-filters">
          <label className="itinerary-filter">
            <CalendarDays size={18} />
            <select
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            >
              {itineraryList.map((item) => (
                <option key={item.date} value={item.date}>
                  {item.date}
                </option>
              ))}
            </select>
          </label>

          <label className="itinerary-filter">
            <UserRound size={18} />
            <select
              value={selectedPreference}
              onChange={(event) => setSelectedPreference(event.target.value)}
            >
              {preferenceOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label[currentLang]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {}
      {/* 行程時間軸區塊 */}
      <section className="timeline">
        {filteredSchedules.length === 0 && (
          <div className="empty-card">
            {uiText.emptyPrefix[currentLang]}
            {selectedPreferenceLabel}
            {uiText.emptySuffix[currentLang]}
          </div>
        )}

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

      {}
      {/* 底部高質感對話與智慧回覆區 */}
      <section className="itinerary-feedback">
        <div className="feedback-title">
          <span>▱</span>
          <h3>行程修改意見</h3>
        </div>

        <div className="feedback-input-wrap">
          <input
            type="text"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSubmitFeedback();
              }
            }}
            placeholder={isRecording ? (currentLang === "zh" ? "正在聆聽語音中..." : "Listening...") : uiText.placeholder[currentLang]}
            disabled={isSubmitting}
          />

          <button 
            type="button" 
            className={`mic-button ${isRecording ? "recording" : ""}`}
            onClick={handleMicClick}
          >
            <Mic size={18} />
          </button>

          <button
            type="button"
            className="send-button"
            onClick={handleSubmitFeedback}
            disabled={isSubmitting || !feedback.trim() || isRecording}
          >
            <Send size={16} />
          </button>

        </div> 
      {/* 顯示 AI 回覆區塊 */}
      {aiResponse && (
        <div className="ai-response-box" style={{ background: '#e0f7fa', padding: '10px', margin: '10px 0' }}>
          <strong>👨‍💼 行程規劃師回覆：</strong>
          <p>{aiResponse}</p>
        </div>
      )}

      </section>
    </div>
  );
}

export default ItineraryPage;