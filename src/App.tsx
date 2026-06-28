import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AssistantPage from "./pages/AssistantPage";
import ItineraryPage from "./pages/ItineraryPage";
import GuidePage from "./pages/GuidePage";
import MapPage from "./pages/MapPage";
import LoginPage from "./pages/LoginPage";
import VipLoginPage from "./pages/VipLoginPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import GoogleMapPage from "./pages/GoogleMapPage";

import GuideLoadingPage from "./pages/GuideLoadingPage";
import GuideResultPage from "./pages/GuideResultPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/vip-login" element={<VipLoginPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/assistant" replace />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="itinerary" element={<ItineraryPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="guide/loading" element={<GuideLoadingPage />} />
          <Route path="guide/result" element={<GuideResultPage />} />
          <Route path="map" element={<MapPage />} />
          
          <Route path="google-map" element={<GoogleMapPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;