import apiClient from "./apiClient";

import attractionsMock from "../mocks/attractions.json";

import type { Attraction } from "../types/attraction";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

export const getAttractions =
    async (): Promise<Attraction[]> => {

        if (useMock) {
            return attractionsMock as Attraction[];
        }

        const response =
            await apiClient.get<Attraction[]>(
                "/api/attractions/recommended"
            );

        return response.data;
    };