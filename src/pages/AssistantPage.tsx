import { useState } from "react";
import { Mic, Send } from "lucide-react";
import {
  recording as recordingApi,
  sendMsg as sendMsgApi,
} from "../apis/assistantApi";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

function AssistantPage() {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "尊榮的 陳總 您好，我是您的專屬智能管家。請問有什麼我可以為您服務的？無論是客房服務、設施預約，或是交通安排，我都在這裡為您處理。",
    },
  ]);

  const recording = async () => {
    try {
      setIsRecording(true);

      const result = await recordingApi();

      setMessage(result.text ?? "");
    } finally {
      setIsRecording(false);
    }
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
            className="icon-button"
            onClick={recording}
            disabled={isRecording}
            title="錄音"
          >
            <Mic size={20} />
          </button>

          <button
            type="button"
            className="send-button"
            onClick={sendMsg}
            disabled={isSending}
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