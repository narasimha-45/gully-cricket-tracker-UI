import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import LoadingState from "../components/common/LoadingState";
import { useSeasons } from "../hooks/queries";
import styles from "./InsightsHub.module.css";

const TABS = [
  ["overview", "Overview"],
  ["batting", "Batting"],
  ["bowling", "Bowling"],
  ["teams", "Teams"],
  ["misc", "Fielding"],
];

export default function InsightsHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("all");
  const seasonsQuery = useSeasons();
  const seasons = seasonsQuery.data || [];

  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [location.pathname]);

  const seasonOptions = useMemo(() => seasons.map((season) => ({
    id: season.id || season._id,
    name: season.seasonName || season.name || "Season",
  })).filter((season) => season.id), [seasons]);

  useEffect(() => {
    if (filter !== "all" && !seasonOptions.some((season) => String(season.id) === String(filter))) {
      setFilter("all");
    }
  }, [filter, seasonOptions]);

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.headerRow}>
          <button type="button" className={styles.backBtn} onClick={() => navigate("/")} aria-label="Back to home">←</button>
          <div className={styles.headingWrap}>
            <div className={styles.headingIcon} aria-hidden="true">📊</div>
            <div>
              <p className={styles.headingMini}>Global analytics</p>
              <h1 className={styles.headingTitle}>Insights Hub</h1>
            </div>
          </div>
        </div>

        <label className={styles.filterWrapper}>
          <span className={styles.srOnly}>Season</span>
          <select className={styles.filterSelect} value={filter} onChange={(event) => setFilter(event.target.value)} disabled={seasonsQuery.isLoading}>
            <option value="all">All seasons · Overall</option>
            {seasonOptions.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
          </select>
        </label>
      </header>

      <nav className={styles.tabs} aria-label="Insights sections">
        {TABS.map(([path, label]) => (
          <NavLink key={path} to={path} className={({ isActive }) => isActive ? styles.activeTab : styles.tab}>{label}</NavLink>
        ))}
      </nav>

      <main className={styles.content}>
        {seasonsQuery.isLoading ? <LoadingState label="Loading seasons…" /> : (
          <Outlet context={{ globalFilter: filter }} />
        )}
      </main>
    </div>
  );
}
