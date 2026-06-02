import { useEffect, useMemo, useState } from "react";
import { CalendarDays, UserRound } from "lucide-react";
import { getExclusiveItinerary } from "../apis/itineraryApi";

import type {
  ItineraryDateGroup,
  ItinerarySchedule,
} from "../types/itinerary";

const preferenceOptions = [
  {
    value: 0,
    label: "全部偏好",
  },
  {
    value: 1,
    label: "休閒放鬆",
  },
  {
    value: 2,
    label: "美食體驗",
  },
];

function ItineraryPage() {
  const [itineraryList, setItineraryList] = useState<
    ItineraryDateGroup[]
  >([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPreference, setSelectedPreference] = useState(0);

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

    if (selectedPreference === 0) {
      return schedules;
    }

    return schedules.filter(
      (item) => item.preference === selectedPreference
    );
  }, [selectedDateGroup, selectedPreference]);

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
                setSelectedPreference(Number(event.target.value))
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
    </div>
  );
}

export default ItineraryPage;