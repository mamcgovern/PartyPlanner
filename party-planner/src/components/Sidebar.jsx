import { NavLink } from "react-router-dom";

function Sidebar() {
  const getNavClass = ({ isActive }) =>
    isActive
      ? "sidebar-link active"
      : "sidebar-link";

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
          <span className="nav-icon">
            ⌂
          </span>

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
            <span className="nav-icon">
              ♟
            </span>

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
            <span className="nav-icon">
              ✓
            </span>

            Tasks
          </NavLink>

          <NavLink
            to="/food-drinks"
            className={getNavClass}
          >
            <span className="nav-icon">
              ♨
            </span>

            Food & Drinks
          </NavLink>

          <NavLink
            to="/recipes"
            className={getNavClass}
          >
            <span className="nav-icon">
              ▤
            </span>

            Recipes & Groceries
          </NavLink>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-section-title">
            Party Design
          </span>

          <NavLink
            to="/decorations"
            className={getNavClass}
          >
            <span className="nav-icon">
              ✦
            </span>

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
            <span className="nav-icon">
              ≡
            </span>

            Notes
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <strong>Party Planning</strong>

        <span>
          Food, guests, decor & more
        </span>
      </div>
    </aside>
  );
}

export default Sidebar;