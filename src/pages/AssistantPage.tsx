import { useEffect, useState, useRef } from "react";
import { Mic, Send } from "lucide-react";
import {
  sendMsg as sendMsgApi,
  speechToText
} from "../apis/assistantApi";
import type { ChatMessage } from "../types/chat_message";
import type { CustomerProfile } from "../types/auth";

function AssistantPage() {
  const [message, setMessage] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioDataRef = useRef<Float32Array[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const customerProfileText = localStorage.getItem("customer_profile");

    if (!customerProfileText) {
      return;
    }

    const customerProfile: CustomerProfile = JSON.parse(customerProfileText);

    setMessages([
      {
        id: 1,
        role: "assistant",
        text: `尊榮的 ${customerProfile.full_name} 您好，我是您的專屬智能管家。請問有什麼我可以為您服務的？無論是客房服務、設施預約，或是交通安排，我都在這裡為您處理。`,
      },
    ]);
  }, []);

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

      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < buffer.length;
        i += 1
      ) {
        accum += buffer[i];
        count += 1;
      }

      result[offsetResult] = accum / count;
      offsetResult += 1;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  };

  const encodeWav = (
    samples: Float32Array,
    sampleRate: number
  ): Blob => {
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

    return new Blob([view], {
      type: "audio/wav",
    });
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

  const recording = async () => {
    if (!isRecording) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

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

      return;
    }

    setIsRecording(false);

    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());

    const audioContext = audioContextRef.current;

    if (!audioContext) {
      return;
    }

    const mergedAudioData = mergeAudioData(audioDataRef.current);

    const downsampledAudioData = downsampleBuffer(
      mergedAudioData,
      audioContext.sampleRate,
      16000
    );

    const wavBlob = encodeWav(downsampledAudioData, 16000);

    await audioContext.close();

    audioContextRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
    audioDataRef.current = [];

    const result = await speechToText(wavBlob);

    setMessage(result.text ?? "");
  };

  const sendMsg = async () => {
    const text = message.trim();

    if (!text) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsSending(true);

    try {
      const result = await sendMsgApi(text);

      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: result.reply ?? "已收到您的需求，我會立即為您處理。",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
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
      <div className="chat-list">
        <div className="chat-date">今天</div>

        {messages.map((item) => (
          <div
            key={item.id}
            className={
              item.role === "user"
                ? "chat-row user"
                : "chat-row assistant"
            }
          >
            <div className="chat-bubble">{item.text}</div>
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <div className="chat-input-box">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="請輸入您的問題或需求..."
          />

          <button
            type="button"
            className={`icon-button ${isRecording ? "recording" : ""}`}
            onClick={recording}
            title={isRecording ? "停止錄音" : "開始錄音"}
          >
            <Mic size={20} />
          </button>

          <button
            type="button"
            className="send-button"
            onClick={sendMsg}
            disabled={isSending || isRecording}
            title="傳送"
          >
            <Send size={20} />
          </button>
        </div>

        <div className="quick-actions">
          <button onClick={() => setMessage("需要多送兩瓶水")}>
            需要多送兩瓶水
          </button>
          <button onClick={() => setMessage("我想預約 SPA")}>
            預約 SPA
          </button>
          <button onClick={() => setMessage("請推薦今晚餐廳")}>
            晚餐餐廳推薦
          </button>
          <button onClick={() => setMessage("請幫我接駁車時間")}>
            接駁車時間
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssistantPage;