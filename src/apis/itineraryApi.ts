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

export const submitFeedback = async (
  message: string
): Promise<ItineraryFeedbackResponse> => {
  const response =
    await apiClient.post<ItineraryFeedbackResponse>(
      "/api/itinerary/feedback",
      {
        message,
      }
    );

  return response.data;
};