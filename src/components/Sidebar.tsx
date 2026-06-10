import { useEffect, useState } from "react";
import { CalendarDays, Camera, Map, MessageSquare } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { CustomerProfile } from "../types/auth";

const menuItems = [
  {
    label: "智能幫手",
    path: "/assistant",
    icon: MessageSquare,
  },
  {
    label: "行程推薦",
    path: "/itinerary",
    icon: CalendarDays,
  },
  {
    label: "專屬導遊",
    path: "/guide",
    icon: Camera,
  },
  {
    label: "景點地圖",
    path: "/map",
    icon: Map,
  },
];

function Sidebar() {
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

      <div className="guest-info">
        <p>歡迎回來</p>
        <strong>{profile.name || "VIP 貴賓"}</strong>
        <span>{profile.roomName || "尊榮旅客服務"}</span>
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
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;