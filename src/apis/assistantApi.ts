import apiClient from "./apiClient";

import speechToTextMock from "../mocks/speech_to_text.json";
import smartHelperMsgMock from "../mocks/smart_helper_msg.json";

import type {
  SpeechToTextResponse,
  SmartHelperResponse,
} from "../types/assistant";

const useMock =
  import.meta.env.VITE_USE_MOCK === "true";

export const recording =
  async (): Promise<SpeechToTextResponse> => {
    if (useMock) {
      return speechToTextMock;
    }

    const response =
      await apiClient.post<SpeechToTextResponse>(
        "/api/assistant/speech-to-text"
      );

    return response.data;
  };

export const sendMsg = async (
  message: string
): Promise<SmartHelperResponse> => {
  if (useMock) {
    return smartHelperMsgMock;
  }

  const response =
    await apiClient.post<SmartHelperResponse>(
      "/api/assistant/send-msg",
      {
        message,
      }
    );

  return response.data;
};