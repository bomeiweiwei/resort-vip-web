  import apiClient from "./apiClient";
  import exclusiveItineraryMock from "../mocks/exclusive_itinerary.json";

  import type { ItineraryDateGroup, ItineraryFeedbackResponse } from "../types/itinerary";

  const useMock = import.meta.env.VITE_USE_MOCK === "true";

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

  // itineraryApi.ts
  export const submitFeedback = async (
    message: string,
    date: string, // 1. 新增 date 參數
    lang: string = "zh"
  ): Promise<ItineraryFeedbackResponse> => {
    const response =
      await apiClient.post<ItineraryFeedbackResponse>(
        "/api/itinerary/feedback",
        {
          message,
          date, // 2. 將 date 放入 Request Body 中送往後端
          lang
        }
      );

    return response.data;
  };
  // 修改 itinerary.ts 的最後一段 🚀
  export type ItineraryFeedbackResponse = {
    success: boolean;
    message: string;
    audio_base64?: string; // 補上這個選填欄位，紅字就會消失囉！
  };
