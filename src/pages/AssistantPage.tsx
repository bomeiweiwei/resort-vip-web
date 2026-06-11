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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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

  const recording = async () => {
    if (!isRecording) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        stream.getTracks().forEach((track) => track.stop());

        const result = await speechToText(audioBlob);

        setMessage(result.text ?? "");
      };

      mediaRecorder.start();
      setIsRecording(true);

      return;
    }

    mediaRecorderRef.current?.stop();
    setIsRecording(false);
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