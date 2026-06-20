import axios from "axios";

// 🎯 建立 Axios 實例，baseURL 設定為 "/api"
// 這樣 Vite Proxy 就會自動攔截帶有 /api 的請求，並幫您轉發到 Cloudflare Tunnel / Ngrok 後端
const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export type GuideAnalyzeResponse = {
  success: boolean;
  title: string;
  location: string;
  guideMessage: string;
  audioUrl?: string; // 後端合成語音的串流 URL
};

export type GuideChatResponse = {
  success: boolean;
  user_text?: string; // 語音辨識 STT 轉譯出來的文字
  reply: string;      // AI 導遊回覆的文字
  audioUrl?: string;  // AI 導遊回覆語音的串流 URL
};

/**
 * 1. 拍照上傳分析 API
 * @param imageFile 照片檔案 (File)
 * @param language 目前語系 ("zh" 或 "en")
 */
export const analyzeGuideImage = async (
  imageFile: File,
  language: string
): Promise<GuideAnalyzeResponse> => {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("language", language);

  const response = await apiClient.post<GuideAnalyzeResponse>(
    "/guide/analyze",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

/**
 * 2. 傳送後續問答需求 API (支援純文字、語音錄音檔案，或兩者皆有)
 */
export const sendGuideChatMessage = async (params: {
  text?: string;
  voice?: Blob;
  attractionTitle: string;
  language: string;
}): Promise<GuideChatResponse> => {
  const formData = new FormData();
  formData.append("attraction_title", params.attractionTitle);
  formData.append("language", params.language);

  // 如果使用者有打字，放入 text 欄位
  if (params.text) {
    formData.append("text", params.text);
  }

  // 如果使用者有長按麥克風錄音，把二進位 Blob 包裝成音檔傳送，並指定檔名以利後端讀取副檔名
  if (params.voice) {
    formData.append("voice", params.voice, "voice.wav");
  }

  const response = await apiClient.post<GuideChatResponse>(
    "/guide/chat",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};