import axios from "axios";

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
  user_text?: string;  
};

export type AnalyzeInputParams = {
  image?: File;
  text?: string;
  voice?: Blob;
  attractionTitle?: string;
  userName?: string; // 選填：若頁面呼叫時未傳入，會自動由 API 內部讀取
  language: string;
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
 * 🎯 統一多模態分析 API (支援圖片、文字、語音，並包含景點上下文與自動取得顧客資料)
 */
export const analyzeGuideInput = async (params: AnalyzeInputParams): Promise<GuideResponse> => {
  // 👤 取得旅客稱呼：若外部傳入空、未傳入或傳入預設的 "貴賓"，則自動從 localStorage 的 customer_profile 解析真實姓名
  const finalUserName = (params.userName && params.userName !== "貴賓")
    ? params.userName
    : getCustomerNameFromStorage();

  if (useMock) {
    // 💡 啟用 Mock 時，根據讀取到的旅客姓名回傳高雅的親切導覽回覆
    return {
      success: true,
      title: params.text || "溫泉公園木質古亭",
      location: params.language === "en" ? "Zen Garden" : "溫泉園區 A 區",
      guideMessage: params.language === "en" 
        ? `Hello, ${finalUserName}! Welcome to our Hot Spring Pavilion. It is built entirely with premium local cypress.` 
        : `您好，${finalUserName}！歡迎來到溫泉公園木質古亭。這座古亭建於 1980 年代，完全採用當地的優質檜木製成，十分清幽。`,
      audioUrl: ""
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