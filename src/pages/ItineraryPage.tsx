import { useEffect, useMemo, useState } from "react";
import { CalendarDays, UserRound } from "lucide-react";
import { getExclusiveItinerary, submitFeedback } from "../apis/itineraryApi";

import type {
  ItineraryDateGroup,
  ItinerarySchedule,
} from "../types/itinerary";

const preferenceOptions = [
  {
    value: "全部偏好",
    label: "全部偏好",
  },
  {
    value: "觀光園區",
    label: "觀光園區",
  },
  {
    value: "在地文化",
    label: "在地文化",
  },
  {
    value: "餐飲美食",
    label: "餐飲美食",
  },
  {
    value: "溫泉公園",
    label: "溫泉公園",
  },
];

function ItineraryPage() {
  const [itineraryList, setItineraryList] = useState<
    ItineraryDateGroup[]
  >([]);

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

    return schedules.filter(
      (item) => item.preference === selectedPreference
    );
  }, [selectedDateGroup, selectedPreference]);

  const handleSubmitFeedback = async () => {
    const text = feedback.trim();

    if (!text) {
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await submitFeedback(text, selectedDate);

      if (result.success) {
        console.log(result.message);
        setFeedback("");
      }
    } catch (error) {
      console.error(error);
      alert("送出失敗");
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const selectedPreferenceLabel =
    preferenceOptions.find((item) => item.value === selectedPreference)
      ?.label ?? "全部偏好";

  return (
    <div className="itinerary-page">
      <section className="itinerary-hero">
        <h2>專屬行程規劃</h2>
        <p>基於您的入住資訊與喜好，為您量身打造。</p>

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
              onChange={(event) =>
                setSelectedPreference(event.target.value)
              }
            >
              {preferenceOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="timeline">
        {filteredSchedules.length === 0 && (
          <div className="empty-card">
            此日期沒有符合「{selectedPreferenceLabel}」的行程。
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
            placeholder="想調整什麼行程？支援文字與語音"
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