import { Image as ImageIcon } from "lucide-react";

function GuideLoadingPage() {
  return (
    <main className="guide-loading-page">
      <section className="guide-loading-content">
        <div className="guide-loading-card">
          <ImageIcon size={44} />
        </div>

        <p>正在分析景點資訊...</p>
      </section>
    </main>
  );
}

export default GuideLoadingPage;