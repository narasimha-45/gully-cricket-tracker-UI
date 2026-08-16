import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import LoadingState from "../components/common/LoadingState";
import { useSeasons } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./SeasonLayout.module.css";

export default function SeasonLayout() {
  const navigate = useNavigate();
  const { seasonId } = useParams();
  const seasonsQuery = useSeasons();
  const season = (seasonsQuery.data || []).find(
    (item) => String(item.id) === String(seasonId),
  );

  return (
    <div>
      <header className={styles.stickyHeader}>
        <div className={styles.subHeader}>
          <button
            type="button"
            className={styles.back}
            onClick={() => navigate("/")}
            aria-label="Back to seasons"
          >
            ←
          </button>
          <div className={styles.seasonTitleWrap}>
            <span className={styles.eyebrow}>Season</span>
            <div className={styles.seasonName}>
              {seasonsQuery.isLoading
                ? "Loading…"
                : formatName(season?.seasonName || "Season")}
            </div>
          </div>
        </div>

        <nav className={styles.tabs} aria-label="Season navigation">
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
        </nav>
      </header>

      {seasonsQuery.isError ? (
        <div className={styles.queryError} role="alert">
          <strong>Season details are temporarily unavailable.</strong>
          <button type="button" onClick={() => seasonsQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : seasonsQuery.isLoading && !season ? (
        <div className={styles.accessibleLoading} aria-hidden="true">
          <LoadingState label="Loading season…" />
        </div>
      ) : (
        <div className={styles.content}>
          <Outlet />
        </div>
      )}
    </div>
  );
}
