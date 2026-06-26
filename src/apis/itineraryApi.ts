import apiClient from "./apiClient";
import exclusiveItineraryMock from "../mocks/exclusive_itinerary.json";

import type { ItineraryDateGroup, ItineraryFeedbackResponse } from "../types/itinerary";
// 如果需要共用 assistant 的語言型別，可以從 assistant 引入
import type { AssistantResponse } from "../types/assistant"; 

const useMock = import.meta.env.VITE_USE_MOCK === "true";

// 1. 獲取專屬行程
export const getExclusiveItinerary = async (): Promise<
  ItineraryDateGroup[]
> => {
  if (useMock) {
    return exclusiveItineraryMock;
  }

  const response = await apiClient.get<ItineraryDateGroup[]>(
    "/api/itinerary/exclusive-itinerary"
  );

  return response.data;
};

// 2. 送出文字回饋
export const submitFeedback = async (
  message: string,
  date: string, 
  lang: string = "zh"
): Promise<ItineraryFeedbackResponse> => {
  const response =
    await apiClient.post<ItineraryFeedbackResponse>(
      "/api/itinerary/feedback",
      {
        message,
        date, 
        lang
      }
    );

  return response.data;
};

// ==========================================
// 新增：行程推薦專用的 語音輸入 (Speech to Text)
// ==========================================
export const speechToTextForItinerary = async (
  audioBlob: Blob
): Promise<ItineraryFeedbackResponse> => {
  if (useMock) {
    return itinerarySpeechToTextMock;
  }

  const formData = new FormData();
  // 將錄音檔放入 FormData
  formData.append("file", audioBlob, "recording.wav"); 

  const response =
    await apiClient.post<ItineraryFeedbackResponse>(
      "/api/itinerary/speech-to-text", // 指向 itinerary 的後端路由
      formData
    );

  return response.data;
};

// ==========================================
// 新增：行程推薦專用的 語音回覆 (Text to Speech)
// ==========================================
export const textToSpeechForItinerary = async (
  text: string,
  language: AssistantResponse["language"] = "zh-TW"
): Promise<Blob> => {
  const response = await apiClient.post(
    "/api/itinerary/text-to-speech", // 指向 itinerary 的後端路由
    {
      text,
      language,
    },
    {
      responseType: "blob", // 確保回應格式為二進位音檔
    }
  );

  return response.data;
};