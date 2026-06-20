import { useEffect, useRef } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
// 🎯 引入統一的多模態分析 API (對應 src/apis/guideApi.ts)
import { analyzeGuideInput } from "../apis/guideApi";

const translations = {
  analyzing: { zh: "辨識分析景點資訊...", en: "Identifying attraction info..." },
  noData: { zh: "未接收到任何請求內容，請重新嘗試。", en: "No data received. Please try again." },
  failed: { zh: "景點辨識分析失敗，請重新嘗試。", en: "Attraction analysis failed. Please try again." }
};

export default function GuideLoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasTriggered = useRef(false);
  
  // 🎯 從 MainLayout 取得全域語系狀態
  const context = useOutletContext<any>();
  const currentLang = (context && typeof context === "object" && context.currentLang === "en") ? "en" : "zh";

  useEffect(() => {
    // 💡 防止 React 18 StrictMode 的 Development 階段重複執行兩次 API 請求
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    // 🎯 取得從 GuidePage 帶過來的各種輸入源（圖片、文字或語音）
    const file = location.state?.imageFile as File | undefined;
    const textQuery = location.state?.textQuery as string | undefined;
    const voiceBlob = location.state?.voiceBlob as Blob | undefined;

    // 防呆：如果沒有任何輸入源，退回導遊首頁
    if (!file && !textQuery && !voiceBlob) {
      alert(translations.noData[currentLang]);
      navigate("/guide");
      return;
    }

    const uploadAndAnalyze = async () => {
      try {
        // 🚀 不管是哪種輸入，通通打包送給同一個後端端點進行多模態辨識分析！
        const result = await analyzeGuideInput({
          image: file,
          text: textQuery,
          voice: voiceBlob,
          language: currentLang
        });

        // 成功拿到後端分析結果後，帶著資料前往結果頁 (GuideResultPage)
        navigate("/guide/result", { state: { analysisResult: result } });
      } catch (error: any) {
        console.error("Analysis failed:", error);
        
        // 🎯 捕捉後端 (FastAPI 404) 找不到景點時回傳的客製 detail 錯誤訊息
        const backendErrorMsg = error.response?.data?.detail;
        if (backendErrorMsg) {
          alert(backendErrorMsg);
        } else {
          alert(translations.failed[currentLang]);
        }
        
        // 🎯 失敗、找不到景點或非景點時，乾淨地引導旅客回到第一層（導遊首頁）
        navigate("/guide");
      }
    };

    uploadAndAnalyze();
  }, [location, navigate, currentLang]);

  return (
    <main className="guide-loading-page">
      <section className="guide-loading-content">
        <div className="guide-loading-card">
          <ImageIcon className="animate-pulse" size={44} />
        </div>
        <p>{translations.analyzing[currentLang]}</p>
      </section>
    </main>
  );
}