export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  speech_text?: string;
};