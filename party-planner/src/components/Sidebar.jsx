import { NavLink, useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";

import { auth } from "../services/firebase";

function Sidebar() {
  const navigate = useNavigate();

  const getNavClass = ({ isActive }) =>
    isActive
      ? "sidebar-link active"
      : "sidebar-link";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-eyebrow">
          Party Planner
        </span>

        <h1>Mattie&apos;s 25th</h1>

        <p>Halloween Birthday</p>

        <div className="party-date">
          <span>October 31, 2026</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={getNavClass}
        >
          <span className="nav-icon">⌂</span>
          Dashboard
        </NavLink>

        <div className="sidebar-section">
          <span className="sidebar-section-title">
            People
          </span>

          <NavLink
            to="/guests"
            className={getNavClass}
          >
            <span className="nav-icon">♟</span>
            Guests
          </NavLink>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-section-title">
            Planning
          </span>

          <NavLink
            to="/tasks"
            className={getNavClass}
          >
            <span className="nav-icon">✓</span>
            Tasks
          </NavLink>

          <NavLink
            to="/food-drinks"
            className={getNavClass}
          >
            <span className="nav-icon">♨</span>
            Food & Drinks
          </NavLink>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-section-title">
            Purchasing
          </span>

          <NavLink
            to="/shopping"
            className={getNavClass}
          >
            <span className="nav-icon">▣</span>
            Shopping
          </NavLink>

          <NavLink
            to="/decorations"
            className={getNavClass}
          >
            <span className="nav-icon">✦</span>
            Decorations
          </NavLink>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-section-title">
            Other
          </span>

          <NavLink
            to="/notes"
            className={getNavClass}
          >
            <span className="nav-icon">≡</span>
            Notes
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <strong>Party Planning</strong>

        <span>
          Guests, food, drinks & decor
        </span>

        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <span className="nav-icon">↪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;