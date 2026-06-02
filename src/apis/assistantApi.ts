import axios from "axios";

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
      await axios.post<SpeechToTextResponse>(
        "/api/nlplabs/speech-to-text"
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
    await axios.post<SmartHelperResponse>(
      "/api/nlplabs/smart-helper-msg",
      {
        message,
      }
    );

  return response.data;
};