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
  reply: string;
  language?: "zh-TW" | "en-US" | "ja-JP" | "ko-KR";
};