import { Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

type HeaderProps = {
  title: string;
};

function Header({ title }: HeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("vip_token");
    localStorage.removeItem("vip_user");

    navigate("/login");
  };

  return (
    <header className="top-header">
      <h1>{title}</h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <button
          onClick={handleLogout}
          className="logout-button"
        >
          <LogOut size={18} />
          登出
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