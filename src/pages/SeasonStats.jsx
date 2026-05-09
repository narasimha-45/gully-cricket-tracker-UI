import { NavLink, Outlet } from "react-router-dom";
import styles from "./SeasonStats.module.css";

export default function SeasonStats() {
  return (
    <div>
      {/* Sub-tabs */}
      <div className={styles.subTabs}>
        <NavLink
          to="batting"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Batting
        </NavLink>

        <NavLink
          to="bowling"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Bowling
        </NavLink>

        <NavLink
          to="misc"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Misc
        </NavLink>
      </div>

      {/* Stats content */}
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
