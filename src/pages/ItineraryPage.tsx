import { useEffect, useMemo, useState, useRef } from "react";
import { CalendarDays, Mic, Send, Sparkles, X, Clock, Tag, Play, Pause } from "lucide-react";
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
  placeholder: { zh: "輸入調整需求...", en: "Long press the recording to choose a language..." },
  recordingPlaceholder: { zh: "正在聆聽語音中... ", en: "Listening..." },
  alertFailed: { zh: "意見提交失敗，詳細錯誤請見控制台 (F12)", en: "Submission failed, please check Console (F12)" },
  aiTitle: { zh: "AI 行程規劃師", en: "AI Itinerary Architect" },
  aiThinking: { zh: "正在為您重新規劃並調整行程安排", en: "Optimizing and adjusting your VIP schedule" },
  audioPlay: { zh: "播放語音", en: "Play voice" },
  audioPause: { zh: "暫停語音", en: "Pause voice" },
};

// 🚀 分類標籤的多國語言字典
const preferenceTranslation: Record<string, { zh: string; en: string }> = {
  "觀光園區": { zh: "觀光園區", en: "Attractions" },
  "在地文化": { zh: "在地文化", en: "Local Culture" },
  "餐飲美食": { zh: "餐飲美食", en: "Dining" },
  "溫泉公園": { zh: "溫泉公園", en: "Hot Springs" },
  "其他": { zh: "其他", en: "Others" }
};

// 🚀 安全獲取翻譯標籤的 Helper 函式
const getTranslatedPreference = (pref: string, lang: "zh" | "en") => {
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
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [itineraryList, setItineraryList] = useState<ItineraryDateGroup[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "responded">("idle");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  const [speechLang, setSpeechLang] = useState("zh-TW");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const longPressTimer = useRef<any>(null);
  const isLongPressed = useRef(false);

  const [activeDetailItem, setActiveDetailItem] = useState<ItinerarySchedule | null>(null);

  // 🚀 新增：音訊播放進度與狀態控制
  const [aiAudioBase64, setAiAudioBase64] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    if (currentLang === "zh") {
      setSpeechLang("zh-TW");
    } else {
      setSpeechLang("en-US"); 
    }
  }, [currentLang]);

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

  // 🚀 核心需求：切換頁面 (Unmount) 時，強制暫停並清除音訊播放
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  const initAndUnlockIOSAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    // 只有在還沒有拿到 AI 音檔且音訊處於暫停時，才執行空 Wav 解鎖
    if (audioRef.current.paused && !aiAudioBase64) {
      const audio = audioRef.current;
      audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
      audio.play()
        .then(() => {
          audio.pause(); 
        })
        .catch((e) => {
          console.warn("⚠️ [iOS 語音防禦] 語音通道預解鎖失敗:", e);
        });
    }
  };

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

  // 🚀 封裝音訊播放邏輯與進度條綁定
  const playAudio = (audioBase64: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    setIsAudioPlaying(true);
    setIsAudioPaused(false);
    setPlaybackProgress(0);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setIsAudioPlaying(false);
      setIsAudioPaused(false);
      setPlaybackProgress(0);
    };

    audio.onerror = (e) => {
      console.error("TTS 播放失敗:", e);
      setIsAudioPlaying(false);
      setIsAudioPaused(false);
      setPlaybackProgress(0);
    };

    audio.play().catch((error) => {
      console.warn("⚠️ 瀏覽器阻擋了自動語音播放，等待使用者點擊頁面互動後播放。", error);
      setIsAudioPlaying(true);
      setIsAudioPaused(true); // 自動被擋則設為暫停，讓使用者可以手動點擊
    });
  };

  // 🚀 音訊播放與暫停切換
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isAudioPaused || !isAudioPlaying) {
      audioRef.current.play();
      setIsAudioPlaying(true);
      setIsAudioPaused(false);
    } else {
      audioRef.current.pause();
      setIsAudioPaused(true);
    }
  };

  const executeSubmit = async (textToSend: string, targetDate: string) => {
    const text = textToSend.trim();
    if (!text) return;

    try {
      setIsSubmitting(true);
      setAiStatus("thinking");
      setAiResponse(null);
      
      // 清空前一次的語音與播放狀態
      setAiAudioBase64(null);
      setIsAudioPlaying(false);
      setIsAudioPaused(false);
      setPlaybackProgress(0);

      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (e) {
          console.warn("暫停現有播放失敗:", e);
        }
      }

      const result = await submitFeedback(text, targetDate, speechLang);
      
      if (result.success) {
        setAiStatus("responded");
        setAiResponse(result.message);
        setFeedback("");

        if (result.audio_base64) {
          setAiAudioBase64(result.audio_base64);
          playAudio(result.audio_base64);
        }

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
    // 🚀 核心需求防護：語音播放時禁止同時錄音
    if (isAudioPlaying && !isAudioPaused) {
      setToastMsg(currentLang === "zh" ? "語音播放中，無法同時錄音" : "Cannot record while audio is playing");
      return;
    }

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

  const handlePointerDown = (e: React.PointerEvent) => {
    isLongPressed.current = false;
    
    if (currentLang === "en") {
      longPressTimer.current = setTimeout(() => {
        isLongPressed.current = true;
        setShowLangMenu(true);
        
        if (navigator.vibrate) {
          try {
            navigator.vibrate(50);
          } catch(e) {}
        }
      }, 600); 
    }
  };

  const handlePointerUpOrLeave = (e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleMicClick = (e: React.MouseEvent) => {
    if (isLongPressed.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressed.current = false;
      return;
    }
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

      <section className="timeline">
        {filteredSchedules.map((item) => (
          <div key={`${item.time}-${item.title}`} className="timeline-row">
            <div className="timeline-dot" />

            <article className="timeline-card luxury-horizontal" onClick={() => setActiveDetailItem(item)}>
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

      <section className="itinerary-feedback">
        <div className="feedback-input-wrap">
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={isRecording ? uiText.recordingPlaceholder[currentLang] : uiText.placeholder[currentLang]}
            disabled={isSubmitting}
            className={isRecording ? "listening-placeholder" : ""}
          />

          <div className="mic-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className={`mic-button ${isRecording ? "recording" : ""}`} 
              onClick={handleMicClick}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUpOrLeave}
              onPointerLeave={handlePointerUpOrLeave}
              style={{ touchAction: "none" }}
              // 🚀 核心防禦：如果正在播放 AI 音訊且未暫停，則強迫禁用麥克風按鈕防誤觸
              disabled={isSubmitting || (isAudioPlaying && !isAudioPaused)}
            >
              <Mic size={18} />
            </button>

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
                <div className="ai-response-content">
                  <p style={{ margin: 0 }}>{aiResponse}</p>
                  
                  {/* 🚀 新增：頂級奢華 AI 音訊控制進度條 */}
                  {aiAudioBase64 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px',
                      padding: '10px 14px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '50px',
                      border: '1px solid rgba(245, 158, 11, 0.15)'
                    }}>
                      <button
                        type="button"
                        onClick={togglePlayPause}
                        title={isAudioPlaying && !isAudioPaused ? uiText.audioPause[currentLang] : uiText.audioPlay[currentLang]}
                        style={{
                          background: 'var(--vip-gold, #f59e0b)',
                          color: 'white', border: 'none', borderRadius: '50%',
                          width: '32px', height: '32px', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {isAudioPlaying && !isAudioPaused ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                      </button>
                      <div style={{ flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', background: 'var(--vip-gold, #f59e0b)',
                          width: `${playbackProgress}%`, transition: 'width 0.1s linear'
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 頂級沉浸式行程完整內容彈窗 */}
      {activeDetailItem && (
        <div className="luxury-lightbox-overlay" onClick={() => setActiveDetailItem(null)}>
          <div className="luxury-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setActiveDetailItem(null)}>
              <X size={20} />
            </button>
            
            <div className="modal-hero-img-wrap">
              <img src={getStaticUrl(activeDetailItem.imageUrl || activeDetailItem.image_url)} alt={activeDetailItem.title} className="modal-hero-image" />
            </div>

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