import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import styles from "./SeasonStats.module.css";

export default function SeasonStats() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div>
      {/* SUB TABS */}
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
      </div>{" "}
      {/* CONTENT */}
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
