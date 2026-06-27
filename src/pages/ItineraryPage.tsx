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
  // 🚀 用於追蹤與控制當前正在播放的音訊物件，防止聲音重疊
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

  const fetchItinerary = async () => {
    const data = await getExclusiveItinerary();
    console.log("👉 這是後端吐給前端的真實資料：", data);
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

      // 1. 🛡️ 停止目前可能正在播放的任何音訊（包含 HTML5 Audio 與 Web Speech）
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      // 2. 呼叫後端 API（後端 itinerary_service 的 submit_feedback 會返回 audio_base64）
      const result = await submitFeedback(text, selectedDateRef.current);
      
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
        {filteredSchedules.map((item) => (
          <div key={`${item.time}-${item.title}`} className="timeline-row">
            <div className="timeline-dot" />
            
            <article className={`timeline-card with-cover ${item.imageUrl ? "has-img" : ""}`}>
              {/* 上半部：純大圖封面 */}
              {item.imageUrl && (
                <div className="timeline-cover">
                  <img src={item.imageUrl} alt={item.title} loading="lazy" />
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
          <button 
            className={`mic-button ${isRecording ? "recording" : ""}`} 
            onClick={handleMicClick}
            disabled={isSubmitting}
          >
            <Mic size={18} />
          </button>
          
          {/* 🚀 手動或語音發送：當 isSubmitting 為真時，按鈕圖示會旋轉轉為 Sparkles 載入動態 */}
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