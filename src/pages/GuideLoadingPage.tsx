import { useEffect, useRef } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useLocation, useNavigate, useOutletContext, useInRouterContext, HashRouter } from "react-router-dom";
// 🎯 正式引入您本地的真實後端 API 檔案
import { analyzeGuideImage } from "../apis/guideApi";

const translations = {
  analyzing: { zh: "辨識分析景點資訊...", en: "Identifying attraction info..." },
  noFile: { zh: "未接收到照片，請重新嘗試拍攝。", en: "No photo received. Please try again." },
  failed: { zh: "景點辨識分析失敗，請重新拍照嘗試。", en: "Attraction analysis failed. Please retake the photo and try again." }
};

function GuideLoadingPageInternal() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasTriggered = useRef(false);
  
  const context = useOutletContext<any>();
  const currentLang = (context && typeof context === "object" && context.currentLang === "en") ? "en" : "zh";

  useEffect(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    const file = location.state?.imageFile as File | undefined;
    if (!file) {
      alert(translations.noFile[currentLang]);
      navigate("/guide");
      return;
    }

    const uploadAndAnalyze = async () => {
      try {
        // 🚀 這裡會真實透過 Vite Proxy 發送圖片給 Cloudflare (FastAPI)
        const result = await analyzeGuideImage(file, currentLang);
        navigate("/guide/result", { state: { analysisResult: result } });
      } catch (error) {
        console.error("Analysis failed:", error);
        alert(translations.failed[currentLang]);
        navigate("/guide");
      }
    };

    uploadAndAnalyze();
  }, [location, navigate, currentLang]);

  return (
    <main className="guide-loading-page">
      <section className="guide-loading-content">
        <div className="guide-loading-card">
          <ImageIcon size={44} />
        </div>
        <p>{translations.analyzing[currentLang]}</p>
      </section>
    </main>
  );
}

function GuideLoadingPage() {
  let inRouter = false;
  try { inRouter = useInRouterContext(); } catch (e) { inRouter = false; }
  return inRouter ? <GuideLoadingPageInternal /> : <HashRouter><GuideLoadingPageInternal /></HashRouter>;
}

export default GuideLoadingPage;