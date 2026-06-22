import { useRef, useState, useEffect } from "react";
import {
  GoogleMap,
  InfoWindow,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import "../styles/google-map.css";
import { getAttractions } from "../apis/attractionApi";
import type { Attraction } from "../types/attraction";

type MapPlace = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  description?: string;
  isResort?: boolean;
};

type OriginMode = "resort" | "current";

const resortPlace: MapPlace = {
  id: "resort",
  name: "綠舞國際渡假村",
  category: "渡假村",
  lat: 24.702904014694848,
  lng: 121.8189298992077,
  description: "目前地圖中心點，可從這裡出發前往推薦景點。",
  isResort: true,
};

const toMapPlace = (item: Attraction): MapPlace => {
  return {
    id: item.attraction_id,
    name: item.place_name,
    category: item.category,
    lat: item.latitude,
    lng: item.longitude,
  };
};

export default function GoogleMapPage() {
  const mapRef = useRef<google.maps.Map | null>(null);

  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [originMode, setOriginMode] = useState<OriginMode>("resort");
  const [currentPosition, setCurrentPosition] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [isListOpen, setIsListOpen] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const mapPlaces: MapPlace[] = [
    resortPlace,
    ...attractions.map(toMapPlace),
  ];

  useEffect(() => {
    const loadAttractions = async () => {
      try {
        const result = await getAttractions();
        setAttractions(result);
      } catch (error) {
        console.error(error);
      }
    };

    loadAttractions();
  }, []);

  const moveToPlace = (place: MapPlace) => {
    setSelectedPlace(place);

    mapRef.current?.panTo({
      lat: place.lat,
      lng: place.lng,
    });

    mapRef.current?.setZoom(place.isResort ? 14 : 15);
  };

  const handleUseCurrentOrigin = () => {
    if (!navigator.geolocation) {
      alert("此瀏覽器不支援定位功能");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCurrentPosition(location);
        setOriginMode("current");

        mapRef.current?.panTo(location);
        mapRef.current?.setZoom(15);
      },
      () => {
        alert("無法取得目前位置，請確認瀏覽器定位權限。");
      }
    );
  };

  const openGoogleMapsRoute = (destination: MapPlace) => {
    if (destination.isResort) {
      moveToPlace(destination);
      return;
    }

    const origin =
      originMode === "current" && currentPosition
        ? currentPosition
        : {
            lat: resortPlace.lat,
            lng: resortPlace.lng,
          };

    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${origin.lat},${origin.lng}` +
      `&destination=${destination.lat},${destination.lng}` +
      `&travelmode=driving`;

    window.open(url, "_blank");
  };

  if (!isLoaded) {
    return <div className="google-map-loading">地圖載入中...</div>;
  }

  const listContent = (
    <aside className="google-map-side-panel">
      <div className="google-map-panel-header">
        <h3>推薦清單</h3>
        <button
          className="google-map-close-button"
          onClick={() => setIsListOpen(false)}
        >
          ✕
        </button>
      </div>

      <div className="google-map-origin-buttons">
        <button
          onClick={() => setOriginMode("resort")}
          className={`google-map-origin-button ${
            originMode === "resort" ? "active" : ""
          }`}
        >
          從綠舞出發
        </button>

        <button
          onClick={handleUseCurrentOrigin}
          className={`google-map-origin-button ${
            originMode === "current" ? "active" : ""
          }`}
        >
          從現在位置出發
        </button>
      </div>

      <div className="google-map-origin-text">
        目前起點：
        {originMode === "current" && currentPosition
          ? "我的位置"
          : "綠舞國際渡假村"}
      </div>

      {mapPlaces.map((item) => (
        <div
          key={item.id}
          className={`google-map-place-card ${
            selectedPlace?.id === item.id ? "active" : ""
          }`}
        >
          <div className="google-map-place-name">{item.name}</div>
          <div className="google-map-place-category">{item.category}</div>

          <div className="google-map-card-actions">
            <button
              onClick={() => {
                moveToPlace(item);
                setIsListOpen(false);
              }}
              className="google-map-secondary-button"
            >
              查看位置
            </button>

            {!item.isResort && (
              <button
                onClick={() => openGoogleMapsRoute(item)}
                className="google-map-primary-button"
              >
                查看路線
              </button>
            )}
          </div>
        </div>
      ))}
    </aside>
  );

  return (
    <div className="google-map-page">
      <div className="google-map-header-card">
        <h2>園區與周邊地圖</h2>
        <p>以綠舞國際渡假村為中心，顯示推薦景點位置。</p>
      </div>

      <div className="google-map-layout">
        <div className="google-map-container">
          <GoogleMap
            mapContainerClassName="google-map"
            center={{
              lat: resortPlace.lat,
              lng: resortPlace.lng,
            }}
            zoom={12}
            onLoad={(map) => {
              mapRef.current = map;
            }}
          >
            <Marker
              position={{
                lat: resortPlace.lat,
                lng: resortPlace.lng,
              }}
              title={resortPlace.name}
              label="R"
              onClick={() => moveToPlace(resortPlace)}
            />

            {mapPlaces
              .filter((item) => !item.isResort)
              .map((item) => (
                <Marker
                  key={item.id}
                  position={{
                    lat: item.lat,
                    lng: item.lng,
                  }}
                  title={item.name}
                  onClick={() => moveToPlace(item)}
                />
              ))}

            {currentPosition && (
              <Marker position={currentPosition} title="我的位置" label="我" />
            )}

            {selectedPlace && (
              <InfoWindow
                position={{
                  lat: selectedPlace.lat,
                  lng: selectedPlace.lng,
                }}
                onCloseClick={() => setSelectedPlace(null)}
              >
                <div className="google-map-info-window">
                  <strong>{selectedPlace.name}</strong>
                  <div>{selectedPlace.category}</div>
                  {selectedPlace.description && (
                    <p>{selectedPlace.description}</p>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>

        <div className="google-map-desktop-panel">{listContent}</div>

        {isListOpen && (
          <div
            className="google-map-mobile-overlay"
            onClick={() => setIsListOpen(false)}
          >
            <div
              className="google-map-mobile-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              {listContent}
            </div>
          </div>
        )}

        <button
          className="google-map-floating-button"
          onClick={() => setIsListOpen(true)}
        >
          推薦清單
        </button>
      </div>
    </div>
  );
}