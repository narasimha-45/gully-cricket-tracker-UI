import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import styles from "./SeasonStats.module.css";

const TABS = [
  ["overview", "Overview"],
  ["batting", "Batting"],
  ["bowling", "Bowling"],
  ["teams", "Teams"],
  ["misc", "Fielding"],
];

export default function SeasonStats() {
  const { seasonId } = useParams();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div>
      <nav className={styles.subTabs} aria-label="Season statistics">
        {TABS.map(([path, label]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              isActive ? styles.activeTab : styles.tab
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.content}>
        <Outlet context={{ globalFilter: seasonId }} />
      </div>
    </div>
  );
}
