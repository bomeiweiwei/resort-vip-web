import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AssistantPage from "./pages/AssistantPage";
import ItineraryPage from "./pages/ItineraryPage";
import GuidePage from "./pages/GuidePage";
import MapPage from "./pages/MapPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./routes/ProtectedRoute";

import GuideLoadingPage from "./pages/GuideLoadingPage";
import GuideResultPage from "./pages/GuideResultPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/assistant" replace />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="itinerary" element={<ItineraryPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="guide/loading" element={<GuideLoadingPage />} />
          <Route path="guide/result" element={<GuideResultPage />} />
          <Route path="map" element={<MapPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;