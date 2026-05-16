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
      {/* UNIFIED STICKY HEADER */}
      <div className={styles.stickyHeader}>
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
      </div>

      {/* Page content */}
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
