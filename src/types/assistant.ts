export type SpeechToTextResponse = {
  text: string;
};

export type SmartHelperRequest = {
  message: string;
};

// export type SmartHelperResponse = {
//   reply: string;
// };

export type AssistantResponse = {
  text?: string;
  reply: string;
  speech_reply?: string;
  language?: "zh-TW" | "en-US" | "ja-JP" | "ko-KR";
  audio_base64?: string;
};