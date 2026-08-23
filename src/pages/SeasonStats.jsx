import { useEffect, useLayoutEffect, useRef } from "react";

import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";

import styles from "./SeasonStats.module.css";

const TABS = [
  ["overview", "Overview"],
  ["batting", "Batting"],
  ["bowling", "Bowling"],
  ["teams", "Teams"],
  ["misc", "Fielding"],
  ["partnerships", "Partnerships"],
  ["rivalry", "Rivalry"],
];

/*
 * Keep SeasonStats tab scroll position independent.
 * Using seasonId in the key means every season remembers
 * its own horizontal tab position.
 */
const getTabsScrollKey = (seasonId) =>
  `gully-season-stats-tabs-scroll-left-${seasonId}`;

/*
 * Prevent Chrome/Safari SPA history restoration
 * from resetting horizontal scroll containers.
 */
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

export default function SeasonStats() {
  const { seasonId } = useParams();
  const location = useLocation();

  const tabsRef = useRef(null);
  const tabsScrollLeft = useRef(0);

  /*
   * Vertical page position can still reset when changing tabs.
   * This does NOT control the horizontal tab bar.
   */
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [location.pathname]);

  /*
   * Restore horizontal tab position only when
   * SeasonStats mounts / season changes.
   *
   * IMPORTANT:
   * Do NOT depend on location.pathname here.
   * Otherwise every tab click would reposition the tabs.
   */
  useLayoutEffect(() => {
    const key = getTabsScrollKey(seasonId);

    const savedPosition = Number.parseInt(
      window.sessionStorage.getItem(key) || "0",
      10,
    );

    tabsScrollLeft.current = Number.isFinite(savedPosition) ? savedPosition : 0;

    if (tabsRef.current) {
      tabsRef.current.scrollLeft = tabsScrollLeft.current;
    }
  }, [seasonId]);

  return (
    <div>
      <nav
        ref={tabsRef}
        className={styles.subTabs}
        aria-label="Season statistics"
        onScroll={(event) => {
          const scrollLeft = event.currentTarget.scrollLeft;

          tabsScrollLeft.current = scrollLeft;

          window.sessionStorage.setItem(
            getTabsScrollKey(seasonId),
            String(scrollLeft),
          );
        }}
      >
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
        <Outlet
          context={{
            globalFilter: seasonId,
          }}
        />
      </div>
    </div>
  );
}
