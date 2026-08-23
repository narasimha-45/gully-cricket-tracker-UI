import {
  createElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Flag,
  Handshake,
  Shield,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import LoadingState from "../components/common/LoadingState";
import { useSeasons } from "../hooks/queries";
import styles from "./InsightsHub.module.css";

const TABS = [
  ["overview", "Overview", Activity],
  ["batting", "Batting", Trophy],
  ["bowling", "Bowling", Shield],
  ["teams", "Teams", Users],
  ["misc", "Fielding", Flag],
  ["partnerships", "Partnerships", Handshake],
  ["rivalry", "Rivalry", Swords],
];
const TABS_SCROLL_KEY = "gully-insights-tabs-scroll-left";

// Chrome/Safari apply their own scroll-restoration heuristics on every SPA
// history push, and that can reset a scrollable descendant like .tabs back
// to 0 the instant a nested route changes — even though nothing in this
// component ever asked for that. Taking scrollRestoration out of the
// browser's hands means the only thing that can move .tabs is the user's
// own touch/scroll.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

export default function InsightsHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("all");
  const [seasonOpen, setSeasonOpen] = useState(false);
  const seasonsQuery = useSeasons();

  const tabsRef = useRef(null);
  const tabsScrollLeft = useRef(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  // Restore only when the hub mounts. Route changes must never reposition the
  // tab strip; its position belongs to the user's horizontal gesture.
  useLayoutEffect(() => {
    const savedPosition = Number.parseInt(
      window.sessionStorage.getItem(TABS_SCROLL_KEY) || "0",
      10,
    );
    tabsScrollLeft.current = Number.isFinite(savedPosition) ? savedPosition : 0;
    if (tabsRef.current) tabsRef.current.scrollLeft = tabsScrollLeft.current;
  }, []);

  useEffect(() => {
    const close = () => setSeasonOpen(false);
    if (seasonOpen) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [seasonOpen]);

  const seasonOptions = useMemo(
    () =>
      (seasonsQuery.data || [])
        .map((season) => ({
          id: season.id || season._id,
          name: season.seasonName || season.name || "Season",
        }))
        .filter((season) => season.id),
    [seasonsQuery.data],
  );

  const effectiveFilter =
    filter === "all" ||
    seasonOptions.some((season) => String(season.id) === String(filter))
      ? filter
      : "all";

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.headerRow}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate("/")}
            aria-label="Back to home"
          >
            <ArrowLeft size={17} strokeWidth={2.4} />
          </button>
          <div className={styles.headingWrap}>
            <div className={styles.headingIcon} aria-hidden="true">
              <BarChart3 size={20} strokeWidth={2.2} />
            </div>
            <div>
              <p className={styles.headingMini}>The score beyond the score</p>
              <h1 className={styles.headingTitle}>Insights</h1>
            </div>
          </div>
        </div>

        <div
          className={styles.seasonControl}
          onClick={(event) => event.stopPropagation()}
        >
          <span className={styles.seasonLabel}>SEASON</span>
          <button
            type="button"
            className={styles.filterButton}
            onClick={() => setSeasonOpen((open) => !open)}
            disabled={seasonsQuery.isLoading}
            aria-expanded={seasonOpen}
            aria-haspopup="listbox"
          >
            <span>
              {effectiveFilter === "all"
                ? "All seasons · Overall"
                : seasonOptions.find(
                    (season) => String(season.id) === String(effectiveFilter),
                  )?.name}
            </span>
            <ChevronDown
              size={15}
              className={seasonOpen ? styles.chevronOpen : ""}
            />
          </button>
          {seasonOpen && (
            <div
              className={styles.seasonMenu}
              role="listbox"
              aria-label="Season"
            >
              <button
                type="button"
                role="option"
                aria-selected={effectiveFilter === "all"}
                className={
                  effectiveFilter === "all"
                    ? styles.seasonOptionActive
                    : styles.seasonOption
                }
                onClick={() => {
                  setFilter("all");
                  setSeasonOpen(false);
                }}
              >
                All seasons <span>Overall</span>
              </button>
              {seasonOptions.map((season) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={String(effectiveFilter) === String(season.id)}
                  className={
                    String(effectiveFilter) === String(season.id)
                      ? styles.seasonOptionActive
                      : styles.seasonOption
                  }
                  key={season.id}
                  onClick={() => {
                    setFilter(String(season.id));
                    setSeasonOpen(false);
                  }}
                >
                  {season.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <nav
        ref={tabsRef}
        className={styles.tabs}
        aria-label="Insights sections"
        onScroll={(event) => {
          tabsScrollLeft.current = event.currentTarget.scrollLeft;
          window.sessionStorage.setItem(
            TABS_SCROLL_KEY,
            String(tabsScrollLeft.current),
          );
        }}
      >
        {TABS.map(([path, label, Icon]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              isActive ? styles.activeTab : styles.tab
            }
          >
            {createElement(Icon, { size: 14, strokeWidth: 2.2 })}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <main className={styles.content}>
        {seasonsQuery.isLoading ? (
          <LoadingState label="Loading seasons…" />
        ) : (
          <Outlet context={{ globalFilter: effectiveFilter }} />
        )}
      </main>
    </div>
  );
}
