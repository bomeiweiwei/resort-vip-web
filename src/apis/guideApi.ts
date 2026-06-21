import axios from "axios";
// 🎯 引入實體 JSON 模擬資料檔
import guideAnalyzeMock from "../mocks/guide_result.json";

// 🎯 建立 Axios 實例
const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const useMock = import.meta.env.VITE_USE_MOCK === "true";

export type GuideResponse = {
  success: boolean;
  title: string;       
  location: string;    
  guideMessage: string; 
  audioUrl?: string;   
  imageUrl?: string;   // 後端 Python 傳回的景點圖片 URL (可為相對路徑或絕對路徑)
  user_text?: string;  
};

export type AnalyzeInputParams = {
  image?: File;
  text?: string;
  voice?: Blob;
  attractionTitle?: string;
  userName?: string; // 選填：若頁面呼叫時未傳入，會自動由 API 內部讀取
  language: string;
  history?: string;  // 傳給後端的完整對話歷史 JSON 字串
};

/**
 * 👤 輔助函式：仿照 Sidebar 的做法，主動從 localStorage 內解構出旅客的真實姓名
 */
const getCustomerNameFromStorage = (): string => {
  try {
    const profileText = localStorage.getItem("customer_profile");
    if (profileText) {
      const customerProfile = JSON.parse(profileText);
      return customerProfile?.full_name || "貴賓";
    }
  } catch (error) {
    console.error("Failed to parse customer_profile inside guideApi:", error);
  }
  return "貴賓"; // 預設防呆稱呼
};

/**
 * 🎯 統一多模態 analysis API (支援圖片、文字、語音，並包含景點上下文與自動取得顧客資料)
 */
export const analyzeGuideInput = async (params: AnalyzeInputParams): Promise<GuideResponse> => {
  // 👤 取得旅客稱呼：若外部傳入空、未傳入或傳入預設的 "貴賓"，則自動從 localStorage 的 customer_profile 解析真實姓名
  const finalUserName = (params.userName && params.userName !== "貴賓")
    ? params.userName
    : getCustomerNameFromStorage();

  if (useMock) {
    // 💡 啟用 Mock 時，會直接從實體 mocks/guide_result.json 讀取欄位，並動態將真實旅客姓名帶入對話中！
    const baseMessage = guideAnalyzeMock.guideMessage;
    const personalizedMessage = baseMessage.startsWith("聽完")
      ? `${finalUserName}，${baseMessage}`
      : baseMessage;

    return {
      success: true,
      title: guideAnalyzeMock.title,
      location: guideAnalyzeMock.location,
      guideMessage: personalizedMessage,
      audioUrl: "",
      imageUrl: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80" // 預設水舞廣場背景美照
    };
  }

  const formData = new FormData();
  formData.append("language", params.language);

  // 📸 照片檔案
  if (params.image) {
    formData.append("image", params.image);
  }

  // ✍️ 文字訊息
  if (params.text) {
    formData.append("text", params.text);
  }

  // 🎤 語音錄音檔案
  if (params.voice) {
    formData.append("voice", params.voice, "voice.wav");
  }

  // 🗺️ 當前對話景點上下文 (後續問答追問時使用)
  if (params.attractionTitle) {
    formData.append("attraction_title", params.attractionTitle);
  }

  // 👤 動態旅客專屬姓名
  formData.append("user_name", finalUserName);

  // 傳遞歷史紀錄給後端進行上下文理解與景點限制判定
  if (params.history) {
    formData.append("history", params.history);
  }

  const response = await apiClient.post<GuideResponse>(
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