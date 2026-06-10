import { Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

type HeaderProps = {
  title: string;
};

function Header({ title }: HeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("customer_access_token");
    localStorage.removeItem("customer_profile");

    navigate("/login");
  };

  return (
    <header className="top-header">
      <div>
        <h1>{title}</h1>
        <span className="mobile-header-subtitle">
          RESORT VIP
        </span>
      </div>

      <div className="header-actions">
        <button
          onClick={handleLogout}
          className="logout-button"
        >
          <LogOut size={18} />
          <span>登出</span>
        </button>

        <div className="notification">
          <Bell size={24} />
          <span className="notification-dot" />
        </div>
      </div>
    </header>
  );
}

export default Header;