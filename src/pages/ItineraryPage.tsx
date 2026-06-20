import { useEffect, useMemo, useState } from "react";
import { CalendarDays, UserRound } from "lucide-react";
import { useOutletContext } from "react-router-dom"; // 1. 引入 context 鉤子
import { getExclusiveItinerary, submitFeedback } from "../apis/itineraryApi";

import type {
  ItineraryDateGroup,
  ItinerarySchedule,
} from "../types/itinerary";

// 2. 將下拉選單選項升級為中英雙語結構
const preferenceOptions = [
  { value: "全部偏好", label: { zh: "全部偏好", en: "All Preferences" } },
  { value: "觀光園區", label: { zh: "觀光園區", en: "Theme Park" } },
  { value: "在地文化", label: { zh: "在地文化", en: "Local Culture" } },
  { value: "餐飲美食", label: { zh: "餐飲美食", en: "Dining & Food" } },
  { value: "溫泉公園", label: { zh: "溫泉公園", en: "Hot Spring" } },
];

// 3. 建立 UI 靜態文字的翻譯字典
const uiText = {
  heroTitle: { zh: "專屬行程規劃", en: "Itinerary Planning" },
  heroDesc: { zh: "基於您的入住資訊與喜好，為您量身打造。", en: "Tailor-made based on your check-in information and preferences." },
  feedbackTitle: { zh: "行程修改意見", en: "Itinerary Revision Requests" },
  placeholder: { zh: "想調整什麼行程？支援文字與語音", en: "Any updates? Supports text and voice" },
  alertFailed: { zh: "送出失敗", en: "Submission failed" },
  emptyPrefix: { zh: "此日期沒有符合「", en: "There are no schedules matching \"" },
  emptySuffix: { zh: "」的行程。", en: "\" on this date." },
};

function ItineraryPage() {
  // 4. 從 React Router 的 Outlet 取得父元件傳下來的語系 (zh 或 en)
  // 提示：需要在 MainLayout 的 <Outlet context={{ currentLang }} /> 傳入
  const { currentLang = "zh" } = useOutletContext<{ currentLang: "zh" | "en" }>();

  const [itineraryList, setItineraryList] = useState<ItineraryDateGroup[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPreference, setSelectedPreference] = useState("全部偏好");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadItinerary = async () => {
      const data = await getExclusiveItinerary();
      
      setItineraryList(data);
      if (data.length > 0) {
        setSelectedDate(data[0].date);
      }
    };
    loadItinerary();
  }, []);

  const selectedDateGroup = useMemo(() => {
    return itineraryList.find((item) => item.date === selectedDate);
  }, [itineraryList, selectedDate]);

  const filteredSchedules: ItinerarySchedule[] = useMemo(() => {
    const schedules = selectedDateGroup?.schedules ?? [];
    if (selectedPreference === "全部偏好") {
      return schedules;
    }
    return schedules.filter((item) => item.preference === selectedPreference);
  }, [selectedDateGroup, selectedPreference]);

  const handleSubmitFeedback = async () => {
    const text = feedback.trim();
    if (!text) return;

    try {
      setIsSubmitting(true);
      const result = await submitFeedback(text);
      if (result.success) {
        console.log(result.message);
        setFeedback("");
      }
    } catch (error) {
      console.error(error);
      alert(uiText.alertFailed[currentLang]); // 雙語化 Alert
    } finally {
      setIsSubmitting(false);
    }
  };

  // 取得當前篩選偏好的翻譯標籤
  const selectedPreferenceLabel =
    preferenceOptions.find((item) => item.value === selectedPreference)
      ?.label[currentLang] ?? (currentLang === "zh" ? "全部偏好" : "All Preferences");

  return (
    <div className="itinerary-page">
      <section className="itinerary-hero">
        {/* 雙語化標題與描述 */}
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
                  {item.label[currentLang]} {/* 雙語化下拉選單名稱 */}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="timeline">
        {filteredSchedules.length === 0 && (
          <div className="empty-card">
            {/* 雙語化空資料提示 */}
            {uiText.emptyPrefix[currentLang]}
            {selectedPreferenceLabel}
            {uiText.emptySuffix[currentLang]}
          </div>
        )}

        {filteredSchedules.map((item) => (
          <div key={`${item.time}-${item.title}`} className="timeline-row">
            <div className="timeline-dot" />
            <article className="timeline-card">
              <span>{item.time}</span>
              <h3>{item.title}</h3>
              <p>{item.content}</p>
            </article>
          </div>
        ))}
      </section>

      <section className="itinerary-feedback">
        <div className="feedback-title">
          <span>▱</span>
          <h3>{uiText.feedbackTitle[currentLang]}</h3> {/* 雙語化意見標題 */}
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
            placeholder={uiText.placeholder[currentLang]} // 雙語化 Placeholder
          />

          <button type="button" className="voice-button">
            🎙
          </button>

          <button
            type="button"
            className="send-button"
            onClick={handleSubmitFeedback}
            disabled={isSubmitting}
          >
            ➤
          </button>
        </div>
      </section>
    </div>
  );
}

export default ItineraryPage;