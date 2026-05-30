import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AssistantPage from "./pages/AssistantPage";
import ItineraryPage from "./pages/ItineraryPage";
import GuidePage from "./pages/GuidePage";
import MapPage from "./pages/MapPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/assistant" replace />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="itinerary" element={<ItineraryPage />} />
        <Route path="guide" element={<GuidePage />} />
        <Route path="map" element={<MapPage />} />
      </Route>
    </Routes>
  );
}

export default App;