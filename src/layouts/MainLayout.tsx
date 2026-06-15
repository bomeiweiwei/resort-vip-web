import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const pageTitles: Record<string, string> = {
  "/assistant": "VIP 智能幫手",
  "/itinerary": "專屬行程推薦",
  "/guide": "AI 互動導覽",
  "/guide/loading": "AI 互動導覽",
  "/guide/result": "AI 互動導覽",
  "/map": "園區與周邊地圖",
};

function MainLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "RESORT VIP";

  const isFullContentPage =
    location.pathname === "/guide/loading" ||
    location.pathname === "/guide/result";

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-panel">
        <Header title={title} />

        <section
          className={
            isFullContentPage
              ? "page-content page-content-full"
              : "page-content"
          }
        >
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default MainLayout;