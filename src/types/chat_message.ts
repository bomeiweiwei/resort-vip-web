export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};