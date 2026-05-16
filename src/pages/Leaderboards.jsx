import { useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";

import styles from "./Leaderboards.module.css";

export default function Leaderboards() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate("/")}>
          ←
        </button>

        <div className={styles.headingWrap}>
          <div className={styles.headingIcon}>📊</div>

          <div>
            <p className={styles.headingMini}>Overall Rankings</p>

            <h1 className={styles.headingTitle}>Leaderboards</h1>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className={styles.tabs}>
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

      {/* CONTENT */}
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
