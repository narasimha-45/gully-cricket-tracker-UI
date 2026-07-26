import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import styles from "./InsightsHub.module.css";
import { api, unwrapApiData } from "../api";

export default function InsightsHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("all"); // "all" or specific seasonId
  const [seasons, setSeasons] = useState([]);


  useEffect(() => {
    window.scrollTo(0, 0);
    loadSeasons();
  }, [location.pathname]);

  const loadSeasons = async () => {
    try {
      const response = await api.seasons.getAllSeasons();
      const seasonList = unwrapApiData(response);
      setSeasons(Array.isArray(seasonList) ? seasonList : []);
    } catch (err) {
      console.error("Failed to load seasons", err);
      setSeasons([]);
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
            {seasons.map((season) => {
              const id = season.id || season._id;
              return (
                <option key={id} value={id}>
                  {season.seasonName || season.name || "Season"}
                </option>
              );
            })}
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
        {/* Pass filter down via context to child routes so they know which season to load */}
        <Outlet context={{ globalFilter: filter }} />
      </div>
    </div>
  );
}
