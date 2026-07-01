import { useEffect, useState, useRef } from "react";
import { Mic, Send, Play, Pause, Square } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import {
  sendMsg as sendMsgApi,
  speechToText,
} from "../apis/assistantApi";
import type { ChatMessage } from "../types/chat_message";
import type { CustomerProfile } from "../types/auth";
import axios from "axios";
import "../styles/assistant.css"; // 引入獨立的 CSS 檔案
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 多國語言字典
const uiText = {
  welcomeMsg: {
    zh: (name: string) => `尊榮的 ${name} 您好，我是您的專屬禮賓管家。請問有什麼我可以為您服務的？`,
    en: (name: string) => `Dear ${name}, I am your exclusive smart butler. How may I assist you today? `,
  },
  today: { zh: "今天", en: "Today" },
  thinking: { zh: "🤖 正在思考", en: "🤖 Thinking" },
  placeholder: { zh: "請輸入您的問題或需求...", en: "Type your question or request here..." },
  micStart: { zh: "開始錄音", en: "Start recording" },
  micStop: { zh: "停止錄音", en: "Stop recording" },
  audioPlay: { zh: "播放語音", en: "Play voice" },
  audioPause: { zh: "暫停語音", en: "Pause voice" },
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
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0-100
  const isAudioPlaying = playingMessageId !== null && !isAudioPaused;

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

  const playAudio = (messageId: number, audioBase64: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audioRef.current = audio;
    setPlayingMessageId(messageId);
    setIsAudioPaused(false);
    setPlaybackProgress(0);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      audioRef.current = null;
      setPlayingMessageId(null);
      setIsAudioPaused(false);
      setPlaybackProgress(0);
    };

    audio.onerror = (e) => {
      console.error("TTS 播放失敗:", e);
      audioRef.current = null;
      setPlayingMessageId(null);
      setIsAudioPaused(false);
      setPlaybackProgress(0);
    };

    audio.play().catch((error) => {
      console.error("TTS 播放失敗:", error);
      audioRef.current = null;
      setPlayingMessageId(null);
      setIsAudioPaused(false);
    });
  };

  const togglePlayPause = (messageId: number, audioBase64: string) => {
    if (playingMessageId === messageId && audioRef.current) {
      if (isAudioPaused) {
        audioRef.current.play();
        setIsAudioPaused(false);
      } else {
        audioRef.current.pause();
        setIsAudioPaused(true);
      }
      return;
    }

    playAudio(messageId, audioBase64);
  };

  const recording = async () => {
    if (
        isSending ||
        isAudioPlaying
    ) return;

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
        audioBase64: result.audio_base64,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      setIsThinking(false);
      setIsSending(false);

      if (result.audio_base64) {
        playAudio(assistantMessage.id, result.audio_base64);
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
        isAudioPlaying
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

              {item.role === "assistant" && item.audioBase64 && (
                <div className="audio-playback-bar">
                  <button
                    type="button"
                    className="playback-toggle"
                    onClick={() => togglePlayPause(item.id, item.audioBase64!)}
                    title={
                      playingMessageId === item.id && !isAudioPaused
                        ? uiText.audioPause[currentLang]
                        : uiText.audioPlay[currentLang]
                    }
                  >
                    {playingMessageId === item.id && !isAudioPaused ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                  </button>
                  <div className="playback-track">
                    <div
                      className="playback-progress"
                      style={{
                        width: `${playingMessageId === item.id ? playbackProgress : 0}%`,
                      }}
                    />
                  </div>
                </div>
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
      </div>
      {/* 聊天區塊結束 */}

      <div className="chat-input-area">
        <div className="quick-actions">
          <button disabled={isSending || isRecording || isAudioPlaying} onClick={() => setMessage(uiText.quickActions.water[currentLang])}>
            {uiText.quickActions.water[currentLang]}
          </button>
          <button disabled={isSending || isRecording || isAudioPlaying} onClick={() => setMessage(uiText.quickActions.spa[currentLang])}>
            {uiText.quickActions.spa[currentLang]}
          </button>
          <button disabled={isSending || isRecording || isAudioPlaying} onClick={() => setMessage(uiText.quickActions.dinner[currentLang])}>
            {uiText.quickActions.dinner[currentLang]}
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
            disabled={isSending || isAudioPlaying}
            title={isRecording ? uiText.micStop[currentLang] : uiText.micStart[currentLang]}
          >
            {/* 🎯 這裡使用了 Square，警告就會消失 */}
            {isRecording ? (
              <Square size={16} /> 
            ) : (
              <Mic size={18} />
            )}
          </button>

          <button
            type="button"
            /* 🎯 邏輯：檢查 message.trim() 是否有內容，動態切換 active 類別 */
            className={`send-button ${message.trim().length > 0 ? "active" : ""}`}
            onClick={sendMsg}
            /* 🎯 邏輯：當沒有內容時，強制 disabled 避免送出空訊息 */
            disabled={isSending || isRecording || isAudioPlaying || message.trim().length === 0}
            title={uiText.send[currentLang]}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssistantPage;