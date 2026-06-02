import axios from "axios";
import exclusiveItineraryMock from "../mocks/exclusive_itinerary.json";

import type { ItineraryDateGroup } from "../types/itinerary";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

export const getExclusiveItinerary = async (): Promise<
  ItineraryDateGroup[]
> => {
  if (useMock) {
    return exclusiveItineraryMock;
  }

  const response = await axios.get<ItineraryDateGroup[]>(
    "/api/recommends/exclusive-itinerary"
  );

  return response.data;
};