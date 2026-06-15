import { useState } from "react";
import { MapPin, Mic, Pause, Send } from "lucide-react";
import guideResult from "../mocks/guide_result.json";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

function GuideResultPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: guideResult.guideMessage,
    },
  ]);

  const handleSend = () => {
    const text = message.trim();

    if (!text) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text,
    };

    const assistantMessage: ChatMessage = {
      id: Date.now() + 1,
      role: "assistant",
      text: "這是後端 AI 回答的位置，之後可以改成呼叫 FastAPI 回傳。",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setMessage("");
  };

  return (
    <main className="guide-result-page">
      <section className="guide-result-hero">
        <button type="button" className="guide-restart-button">
          重拍
        </button>

        <div className="guide-result-info">
          <h1>{guideResult.title}</h1>

          <div className="guide-result-location">
            <MapPin size={16} />
            <span>{guideResult.location}</span>
          </div>
        </div>
      </section>

      <section className="guide-audio-card">
        <button type="button" className="guide-audio-button">
          <Pause size={22} />
        </button>

        <div className="guide-audio-track">
          <div className="guide-audio-progress" />
        </div>
      </section>

      <section className="guide-chat-list">
        {messages.map((item) => (
          <div
            key={item.id}
            className={
              item.role === "user"
                ? "guide-chat-row guide-chat-row-user"
                : "guide-chat-row guide-chat-row-assistant"
            }
          >
            <div className="guide-chat-bubble">{item.text}</div>
          </div>
        ))}
      </section>

      <section className="guide-chat-input-area">
        <div className="guide-chat-input-wrap">
          <input
            type="text"
            placeholder="輸入文字或語音..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSend();
              }
            }}
          />

          <button type="button" className="guide-mic-button">
            <Mic size={18} />
          </button>

          <button type="button" className="guide-send-button" onClick={handleSend}>
            <Send size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}

export default GuideResultPage;