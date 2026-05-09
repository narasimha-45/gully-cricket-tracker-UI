import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import styles from "./SeasonLayout.module.css";

export default function SeasonLayout() {
  const navigate = useNavigate();
  const { seasonId } = useParams();

  // Read season name from sessionStorage using seasonId
  const seasonName = (() => {
    try {
      const stored = JSON.parse(
        sessionStorage.getItem("seasons") || "{}"
      );
      return stored[seasonId] || "Season";
    } catch {
      return "Season";
    }
  })();

  return (
    <div>
      {/* Sub header */}
      <div className={styles.subHeader}>
        <button
          className={styles.back}
          onClick={() => navigate("/")}
          aria-label="Back"
        >
          ←
        </button>

        <div className={styles.seasonName}>{seasonName}</div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <NavLink
          to="matches"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Matches
        </NavLink>

        <NavLink
          to="stats"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Stats
        </NavLink>
      </div>

      {/* Page content */}
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
