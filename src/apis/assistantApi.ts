import apiClient from "./apiClient";

import speechToTextMock from "../mocks/speech_to_text.json";
import smartHelperMsgMock from "../mocks/smart_helper_msg.json";

import type {
  SpeechToTextResponse,
  SmartHelperResponse,
} from "../types/assistant";

const useMock =
  import.meta.env.VITE_USE_MOCK === "true";

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

export const speechToText = async (
  audioBlob: Blob
): Promise<SpeechToTextResponse> => {
  if (useMock) {
    return speechToTextMock;
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "recording.wav");

  const response =
    await apiClient.post<SpeechToTextResponse>(
      "/api/assistant/speech-to-text",
      formData
    );

  return response.data;
};