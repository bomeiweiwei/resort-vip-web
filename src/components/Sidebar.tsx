import { CalendarDays, Camera, Map, MessageSquare } from "lucide-react";
import { NavLink } from "react-router-dom";

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
  return (
    <aside className="sidebar">
      <div className="brand-area">
        <div className="brand-logo">V</div>
        <div className="brand-title">RESORT VIP</div>
      </div>

      <div className="guest-info">
        <p>歡迎回來</p>
        <strong>陳總</strong>
        <span>海景尊爵套房 801</span>
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