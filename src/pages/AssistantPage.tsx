import { useEffect, useState, useRef } from "react";
import { Mic, Send } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import {
  sendMsg as sendMsgApi,
  speechToText,
  textToSpeech,
} from "../apis/assistantApi";
import type { ChatMessage } from "../types/chat_message";
import type { CustomerProfile } from "../types/auth";
import axios from "axios";
import type { AssistantResponse } from "../types/assistant";
import "../styles/assistant.css"; // 引入獨立的 CSS 檔案
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 多國語言字典
const uiText = {
  welcomeMsg: {
    zh: (name: string) => `尊榮的 ${name} 您好，我是您的專屬智能管家。請問有什麼我可以為您服務的？`,
    en: (name: string) => `Dear ${name}, I am your exclusive smart butler. How may I assist you today? `,
  },
  today: { zh: "今天", en: "Today" },
  thinking: { zh: "🤖 正在思考", en: "🤖 Thinking" },
  placeholder: { zh: "請輸入您的問題或需求...", en: "Type your question or request here..." },
  micStart: { zh: "開始錄音", en: "Start recording" },
  micStop: { zh: "停止錄音", en: "Stop recording" },
  send: { zh: "傳送", en: "Send" },
  micError: { 
    zh: "無法啟用麥克風，請確認瀏覽器已允許麥克風權限後再試一次。", 
    en: "Unable to access the microphone. Please check your browser permissions and try again." 
  },
  voiceReceived: { 
    zh: "已收到您的語音需求，我會立即為您處理。", 
    en: "Voice request received. I will process it immediately." 
  },
  textReceived: { 
    zh: "已收到您的需求，我會立即為您處理。", 
    en: "Request received. I will process it immediately." 
  },
  systemError: { 
    zh: "抱歉，目前系統暫時無法回應，請稍後再試。", 
    en: "Sorry, the system is temporarily unresponsive. Please try again later." 
  },
  timeoutError: { 
    zh: "系統回應時間過長，請稍後再試。", 
    en: "System response timeout. Please try again later." 
  },
  quickActions: {
    water: { zh: "需要多送兩瓶水", en: "Need 2 more bottles of water" },
    spa: { zh: "我想預約 SPA", en: "Book a SPA session" },
    dinner: { zh: "請推薦今晚餐廳", en: "Dinner restaurant recommendations" },
    shuttle: { zh: "請幫我接駁車時間", en: "Shuttle bus schedule" }
  }
};

function AssistantPage() {
  const { currentLang = "zh" } = useOutletContext<{ currentLang: "zh" | "en" }>();
  
  const [message, setMessage] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioDataRef = useRef<Float32Array[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);

  // 初始化歡迎訊息
  useEffect(() => {
    const customerProfileText = localStorage.getItem("customer_profile");

    if (!customerProfileText) return;

    const customerProfile: CustomerProfile = JSON.parse(customerProfileText);

    // 依據當前語言設定初始訊息，且只在最一開始載入
    if (messages.length === 0) {
      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          text: uiText.welcomeMsg[currentLang](customerProfile.full_name),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // 精準控制聊天列表內部滾動，並加入 isThinking 觸發
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTo({
        top: chatListRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isThinking]);

  const downsampleBuffer = (
    buffer: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Float32Array => {
    if (outputSampleRate === inputSampleRate) {
      return buffer;
    }

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
        accum += buffer[i];
        count += 1;
      }

      result[offsetResult] = accum / count;
      offsetResult += 1;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  };

  const encodeWav = (samples: Float32Array, sampleRate: number): Blob => {
    const bytesPerSample = 2;
    const blockAlign = bytesPerSample;
    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    const writeString = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i += 1) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * bytesPerSample, true);

    let offset = 44;

    for (let i = 0; i < samples.length; i += 1, offset += 2) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
    }

    return new Blob([view], { type: "audio/wav" });
  };

  const mergeAudioData = (audioData: Float32Array[]): Float32Array => {
    const length = audioData.reduce((sum, item) => sum + item.length, 0);
    const result = new Float32Array(length);
    let offset = 0;
    audioData.forEach((item) => {
      result.set(item, offset);
      offset += item.length;
    });
    return result;
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockAudioUrlRef = useRef<string | null>(null);

  // 手機瀏覽器（iOS Safari / mobile Chrome）的自動播放限制：
  // <audio>.play() 必須在使用者手勢的同步呼叫堆疊內觸發才會被允許。
  // 錄音流程在拿到語音回覆前會經過好幾個 await（speechToText、textToSpeech），
  // 等到真正要播放時，手勢已經過期，導致桌機可播放、手機卻無聲。
  // 解法：在按下「停止錄音」當下（同步、尚未 await）就先播放同一個 <audio>
  // 元素一次（靜音的極短音檔），把這個元素標記為「使用者已允許播放」，
  // 之後在非同步流程中重複使用同一個元素設定真正的語音來源即可正常播放。
  const unlockAudioPlayback = () => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;
    }

    if (!unlockAudioUrlRef.current) {
      unlockAudioUrlRef.current = URL.createObjectURL(encodeWav(new Float32Array(1), 8000));
    }

    if (!audio.src) {
      audio.src = unlockAudioUrlRef.current;
    }

    const wasMuted = audio.muted;
    audio.muted = true;

    audio
      .play()
      .then(() => {
        audio!.pause();
        audio!.currentTime = 0;
        audio!.muted = wasMuted;
      })
      .catch(() => {
        audio!.muted = wasMuted;
      });
  };

  const playTextToSpeech = async (
    text: string,
    language: AssistantResponse["language"] = currentLang === "zh" ? "zh-TW" : "en-US"
  ) => {
    const audioBlob = await textToSpeech(text, language);

    const audioUrl = URL.createObjectURL(audioBlob);

    // 重複使用 unlockAudioPlayback() 已解鎖的同一個 <audio> 元素，
    // 而不是 new 一個全新的元素，手機才會允許在這裡播放。
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;

    audio.pause();
    audio.muted = false;
    audio.src = audioUrl;

    await new Promise<void>((resolve, reject) => {

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onerror = (e) => {
          URL.revokeObjectURL(audioUrl);
          reject(e);
        };

        audio.play().catch(reject);

    });
  };

  // 離開頁面時停止語音播放並釋放暫存的 blob URL
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (unlockAudioUrlRef.current) {
        URL.revokeObjectURL(unlockAudioUrlRef.current);
      }
    };
  }, []);

  const recording = async () => {
    if (
        isSending ||
        isGeneratingSpeech
    ) return;

    // 必須在這裡（使用者點擊的同步呼叫堆疊內）解鎖，才能讓手機瀏覽器
    // 之後在 await 之後呼叫的 playTextToSpeech() 順利播放語音。
    unlockAudioPlayback();

    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        audioDataRef.current = [];

        processor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          audioDataRef.current.push(new Float32Array(inputData));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        streamRef.current = stream;
        audioContextRef.current = audioContext;
        processorRef.current = processor;

        setIsRecording(true);
      } catch (error) {
        console.error("microphone permission error:", error);
        setMessages((prev) => [
          ...prev, 
          { id: Date.now(), role: "assistant", text: uiText.micError[currentLang] }
        ]);
        setIsRecording(false);
      }
      return;
    }

    setIsRecording(false);

    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());

    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const mergedAudioData = mergeAudioData(audioDataRef.current);
    const downsampledAudioData = downsampleBuffer(mergedAudioData, audioContext.sampleRate, 16000);
    const wavBlob = encodeWav(downsampledAudioData, 16000);

    await audioContext.close();

    audioContextRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
    audioDataRef.current = [];

    try {
      setIsSending(true);
      setIsThinking(true);

      const result = await speechToText(wavBlob);

      const userText = result.text?.trim() || "語音輸入";
      const replyText = result.reply?.trim() || uiText.voiceReceived[currentLang];
      const speechText = result.speech_reply?.trim() || replyText;

      const userMessage: ChatMessage = {
        id: Date.now(),
        role: "user",
        text: userText,
      };

      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: replyText,
        speech_text: speechText,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      setIsThinking(false);
      setIsSending(false);

      if (speechText.trim()) {
        setIsGeneratingSpeech(true);

        playTextToSpeech(speechText, result.language)
          .catch((error) => {
            console.error("TTS 播放失敗:", error);
          })
          .finally(() => {
            setIsGeneratingSpeech(false);
          });
      }
    } catch (error) {
      console.error("speechToText error:", error);
      
      let errorText = uiText.systemError[currentLang];
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          errorText = uiText.timeoutError[currentLang];
        } else {
          errorText = error.response?.data?.message ?? error.response?.data?.detail ?? error.message ?? errorText;
        }
      }

      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: errorText }]);
    } finally {
      setIsThinking(false);
      setIsSending(false);
    }
  };

  const sendMsg = async () => {
    if (
        isSending ||
        isRecording ||
        isGeneratingSpeech
    ) return;
    const text = message.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text }]);
    setMessage("");
    setIsSending(true);

    try {
      setIsThinking(true);

      const result = await sendMsgApi(text);
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: result.reply ?? uiText.textReceived[currentLang],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("sendMsg error:", error);

      let errorText = uiText.systemError[currentLang];
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          errorText = uiText.timeoutError[currentLang];
        } else {
          errorText = error.response?.data?.message ?? error.response?.data?.detail ?? error.message ?? errorText;
        }
      }

      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: errorText }]);
    } finally {
      setIsThinking(false);
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      sendMsg();
    }
  };

  return (
    <div className="assistant-page">
      {/* ⚠️ 修正重點：把所有聊天訊息包在這個 div 裡面 */}
      <div ref={chatListRef} className="chat-list">
        <div className="chat-date">{uiText.today[currentLang]}</div>

        {messages.map((item) => (
          <div key={item.id} className={`chat-row ${item.role}`}>
            <div className="chat-bubble">
              {item.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.text}
                </ReactMarkdown>
              ) : (
                item.text
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="chat-row assistant">
            <div className="chat-bubble thinking-bubble">
              {uiText.thinking[currentLang]}
              <span className="thinking-assistant-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </span>
            </div>
          </div>
        )}
        {isGeneratingSpeech && (
          <div className="speech-generating">
            🔊 語音產生中，請稍候...
          </div>
        )}
      </div> 
      {/* 聊天區塊結束 */}

      <div className="chat-input-area">
        <div className="quick-actions">
          <button disabled={isSending || isRecording || isGeneratingSpeech} onClick={() => setMessage(uiText.quickActions.water[currentLang])}>
            {uiText.quickActions.water[currentLang]}
          </button>
          <button disabled={isSending || isRecording || isGeneratingSpeech} onClick={() => setMessage(uiText.quickActions.spa[currentLang])}>
            {uiText.quickActions.spa[currentLang]}
          </button>
          <button disabled={isSending || isRecording || isGeneratingSpeech} onClick={() => setMessage(uiText.quickActions.dinner[currentLang])}>
            {uiText.quickActions.dinner[currentLang]}
          </button>
          <button disabled={isSending || isRecording || isGeneratingSpeech} onClick={() => setMessage(uiText.quickActions.shuttle[currentLang])}>
            {uiText.quickActions.shuttle[currentLang]}
          </button>
        </div>

        <div className="chat-input-box">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={uiText.placeholder[currentLang]}
          />

          <button
            type="button"
            className={`icon-button ${isRecording ? "recording" : ""}`}
            onClick={recording}
            disabled={isSending || isGeneratingSpeech}
            title={isRecording ? uiText.micStop[currentLang] : uiText.micStart[currentLang]}
          >
            <Mic size={20} />
          </button>

          <button
            type="button"
            className="send-button"
            onClick={sendMsg}
            disabled={isSending || isRecording || isGeneratingSpeech}
            title={uiText.send[currentLang]}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssistantPage;