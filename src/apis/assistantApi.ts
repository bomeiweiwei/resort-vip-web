import apiClient from "./apiClient";

import speechToTextMock from "../mocks/speech_to_text.json";
import smartHelperMsgMock from "../mocks/smart_helper_msg.json";

import type {
  AssistantResponse
} from "../types/assistant";

const useMock =
  import.meta.env.VITE_USE_MOCK === "true";

export const sendMsg = async (
  message: string
): Promise<AssistantResponse> => {
  if (useMock) {
    return smartHelperMsgMock;
  }

  const response =
    await apiClient.post<AssistantResponse>(
      "/api/assistant/send-msg",
      {
        message,
      }
    );

  return response.data;
};

export const speechToText = async (
  audioBlob: Blob
): Promise<AssistantResponse> => {
  if (useMock) {
    return speechToTextMock;
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "recording.wav");

  const response =
    await apiClient.post<AssistantResponse>(
      "/api/assistant/speech-to-text",
      formData
    );

  return response.data;
};