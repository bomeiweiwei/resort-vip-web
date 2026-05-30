import { Bell } from "lucide-react";

type HeaderProps = {
  title: string;
};

function Header({ title }: HeaderProps) {
  return (
    <header className="top-header">
      <h1>{title}</h1>

      <div className="notification">
        <Bell size={24} />
        <span className="notification-dot" />
      </div>
    </header>
  );
}

export default Header;