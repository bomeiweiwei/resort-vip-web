import { useEffect, useState } from "react";
import { CalendarDays, Camera, Map, MessageSquare } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { CustomerProfile } from "../types/auth";

// 1. 將選單標籤改為中英雙語結構
const menuItems = [
  {
    label: { zh: "智能幫手", en: "Assistant" },
    path: "/assistant",
    icon: MessageSquare,
  },
  {
    label: { zh: "行程推薦", en: "Itinerary" },
    path: "/itinerary",
    icon: CalendarDays,
  },
  {
    label: { zh: "專屬導遊", en: "AI Guide" },
    path: "/guide",
    icon: Camera,
  },
  {
    label: { zh: "景點地圖", en: "Map" },
    path: "/google-map",
    icon: Map,
  },
];

// 2. 定義 Props，讓父元件把目前的語系傳進來
type SidebarProps = {
  currentLang: "zh" | "en";
};

function Sidebar({ currentLang }: SidebarProps) {
  const [profile, setProfile] = useState({
    name: "",
    roomName: "",
  });

  useEffect(() => {
    const profileText = localStorage.getItem("customer_profile");

    if (!profileText) {
      return;
    }

    const customerProfile = JSON.parse(profileText) as CustomerProfile;

    setProfile({
      name: customerProfile.full_name,
      roomName: [
        customerProfile.room_type_name,
        customerProfile.room_no,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }, []);

  return (
    <aside className="sidebar">
      <div className="brand-area">
        <div className="brand-logo">V</div>
        <div className="brand-title">RESORT VIP</div>
      </div>

      {/* 3. 訪客資訊區塊也支援雙語翻譯 */}
      <div className="guest-info">
        <p>{currentLang === "zh" ? "歡迎回來" : "Welcome back"}</p>
        <strong>
          {profile.name || (currentLang === "zh" ? "VIP 貴賓" : "VIP Guest")}
        </strong>
        <span>
          {profile.roomName || (currentLang === "zh" ? "尊榮旅客服務" : "Exclusive Service")}
        </span>
      </div>

      <nav className="side-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <Icon size={24} />
              {/* 4. 根據當前語系動態顯示對應的文字 */}
              <span>{item.label[currentLang]}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;