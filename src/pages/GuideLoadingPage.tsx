import { useEffect, useRef } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
// 🎯 引入統一的多模態分析 API (對應 src/apis/guideApi.ts)
import { analyzeGuideInput } from "../apis/guideApi";
import "../styles/guide.css";

const translations = {
  analyzing: { zh: "辨識分析景點資訊...", en: "Identifying attraction info..." },
  noData: { zh: "未接收到任何請求內容，請重新嘗試。", en: "No data received. Please try again." },
  // 🎯 統一的中英雙語「查無景點」精緻提醒
  failed: { 
    zh: "系統未辨識到相符的景點，請重新嘗試。", 
    en: "No matching attraction found. Please try again." 
  }
};

export default function GuideLoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasTriggered = useRef(false);
  
  // 🎯 從 MainLayout 取得全域語系狀態
  const context = useOutletContext<any>();
  const currentLang = (context && typeof context === "object" && context.currentLang === "en") ? "en" : "zh";

  // 🎯 核心防禦：載入期間徹底鎖定全域 Body 滾動，卸載時自動還原
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;

    // 鎖定滾動與高度，防止手機端橡皮筋回彈與 PC 端滾輪滑動
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";

    return () => {
      // 還原設定
      document.body.style.overflow = originalOverflow;
      document.body.style.height = originalHeight;
    };
  }, []);

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
      navigate("/guide", {
        state: { errorMsg: translations.noData }
      });
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

        // 🎯 核心攔截：如果 API 回傳成功，但 success 欄位為 false，或是根本沒有導遊回覆文字 (guideMessage)
        // 這代表 AI 在綠舞渡假村資料庫中查無此景點
        if (result && (result.success === false || !result.guideMessage)) {
          navigate("/guide", { 
            state: { 
              errorMsg: translations.failed // 🎯 傳遞雙語錯誤物件，回退至首頁顯示
            } 
          });
          return;
        }

        // 成功辨識到景點，帶著完整資料前往結果頁 (GuideResultPage)
        navigate("/guide/result", { state: { analysisResult: result } });
      } catch (error: any) {
        console.error("Analysis failed:", error);
        // 🎯 網路或後端異常時，一律帶回首頁並彈出雙語錯誤提醒
        navigate("/guide", { 
          state: { 
            errorMsg: translations.failed 
          } 
        });
      }
    };

    uploadAndAnalyze();
  }, [location, navigate, currentLang]);

  return (
    <main 
      className="guide-loading-page"
      style={{
        height: "calc(100dvh - 120px)", // 🎯 縮短高度，完美切齊底部導覽 Tab 避免產生外層滾動條
        width: "100%",
        minHeight: "auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",       // 🎯 使內容在縮短後的高雅版面中完美垂直置中
        alignItems: "center",           // 🎯 水平置中
        overflow: "hidden",             // 🎯 確保自身不產生任何滾動條
        position: "relative",
        backgroundColor: "#f8fafc"
      }}
    >
      <section className="guide-loading-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div className="guide-loading-card" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <ImageIcon className="animate-pulse" size={44} style={{ color: "var(--primary-color, #10b981)" }} />
        </div>
        <p style={{ fontSize: "15px", color: "#64748b", fontWeight: "500", margin: 0 }}>
          {translations.analyzing[currentLang]}
        </p>
      </section>
    </main>
  );
}