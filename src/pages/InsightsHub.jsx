import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import styles from "./InsightsHub.module.css";

export default function InsightsHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("all"); // "all" or specific seasonId
  const [seasons, setSeasons] = useState([]);

  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchSeasons();
  }, [location.pathname]);

  const fetchSeasons = async () => {
    try {
      const res = await fetch(`${API}/api/seasons`);
      const json = await res.json();
      if (json.success) {
        setSeasons(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch seasons", err);
    }
  };

  // Pass down the filter to context or outlet if necessary
  return (
    <div className={styles.page}>
      {/* HEADER WITH FILTER */}
      <div className={styles.topBar}>
        <div className={styles.headerRow}>
          <button className={styles.backBtn} onClick={() => navigate("/")}>
            ←
          </button>

          <div className={styles.headingWrap}>
            <div className={styles.headingIcon}>📊</div>
            <div>
              <p className={styles.headingMini}>Global Analytics</p>
              <h1 className={styles.headingTitle}>Insights Hub</h1>
            </div>
          </div>
        </div>

        {/* UNIVERSAL FILTER */}
        <div className={styles.filterWrapper}>
          <select 
            className={styles.filterSelect}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Seasons (Overall)</option>
            {seasons.map(s => (
              <option key={s._id} value={s._id}>{s.seasonName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABS */}
      <div className={styles.tabs}>
        <NavLink
          to="overview"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Overview
        </NavLink>

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
          to="teams"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Teams
        </NavLink>

        <NavLink
          to="misc"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Misc
        </NavLink>
        
        <NavLink
          to="matchups"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Matchups
        </NavLink>
      </div>

      {/* CONTENT */}
      <div className={styles.content}>
        {/* Pass filter down via context to child routes so they know which season to fetch */}
        <Outlet context={{ globalFilter: filter }} />
      </div>
    </div>
  );
}
