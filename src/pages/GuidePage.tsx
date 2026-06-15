import { Camera, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { analyzeGuideImage } from "../apis/guideApi";

function GuidePage() {
  const navigate = useNavigate();

  const handleUploadClick = async () => {
    navigate("/guide/loading");

    await analyzeGuideImage();

    navigate("/guide/result");
  };

  return (
    <main className="guide-page">
      <section className="guide-hero">
        <div className="guide-camera-circle">
          <Camera size={56} />
        </div>

        <h1>AI 專屬語音導遊</h1>

        <p>
          拍下園區內任何景點、藝術品或植物，系統將自動為您進行語音導覽，
          並可深入互動問答。
        </p>

        <button
          type="button"
          className="guide-upload-button"
          onClick={handleUploadClick}
        >
          <ImageIcon size={26} />
          拍照 / 上傳圖片
        </button>
      </section>
    </main>
  );
}

export default GuidePage;