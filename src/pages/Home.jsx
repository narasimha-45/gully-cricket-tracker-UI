import { useNavigate } from "react-router-dom";
import CreateSeasonModal from "../components/CreateSeasonModal";
import GlobalSearch from "../components/GlobalSearch";
import EmptyState from "../components/common/EmptyState";
import LoadingState from "../components/common/LoadingState";
import { useSeasons } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./Home.module.css";

export default function Home({ open, onClose }) {
  const navigate = useNavigate();
  const seasonsQuery = useSeasons();
  const seasons = seasonsQuery.data || [];

  seasons.sort((a, b) => {
    return a?.createdAt > b?.createdAt ? -1 : 1;
  });

  return (
    <>
      <main className={styles.page}>
        <section className={styles.heroCard} aria-labelledby="home-title">
          <p className={styles.heroTag}>🏏 Gully Cricket</p>
          <h1 id="home-title" className={styles.heroTitle}>
            Score fast. Remember every match.
          </h1>
          <p className={styles.heroSubtitle}>
            Local-first cricket scoring that keeps working even when the ground
            has poor signal.
          </p>
        </section>

        <GlobalSearch />

        <section className={styles.dashboardGrid} aria-label="Quick actions">
          <button
            type="button"
            className={styles.dashboardCard}
            onClick={() =>
              document.getElementById("seasons-section")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            <span className={styles.cardIcon} aria-hidden="true">
              🏆
            </span>
            <span>
              <strong>Seasons</strong>
              <small>Create, resume, and review matches</small>
            </span>
          </button>

          <button
            type="button"
            className={`${styles.dashboardCard} ${styles.leaderboardCard}`}
            onClick={() => navigate("/insights")}
          >
            <span className={styles.cardIcon} aria-hidden="true">
              📊
            </span>
            <span>
              <strong>Stats</strong>
              <small>Batting, bowling, teams, and fielding</small>
            </span>
          </button>
        </section>

        <section
          id="seasons-section"
          className={styles.section}
          aria-labelledby="seasons-title"
        >
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>Your cricket</span>
              <h2 id="seasons-title">Seasons</h2>
            </div>
            <span className={styles.seasonCount}>{seasons.length}</span>
          </div>

          {seasonsQuery.isLoading && <LoadingState label="Loading seasons…" />}

          {seasonsQuery.isError && (
            <div className={styles.errorState} role="alert">
              <strong>Could not load seasons</strong>
              <span>
                {seasonsQuery.error?.message ||
                  "Check your connection and try again."}
              </span>
              <button type="button" onClick={() => seasonsQuery.refetch()}>
                Try again
              </button>
            </div>
          )}

          {!seasonsQuery.isLoading &&
            !seasonsQuery.isError &&
            seasons.length === 0 && (
              <EmptyState
                title="No seasons yet"
                subtitle="Create your first season, add two teams, and start scoring."
              />
            )}

          {!seasonsQuery.isLoading &&
            !seasonsQuery.isError &&
            seasons.length > 0 && (
              <div className={styles.list}>
                {seasons.map((season) => (
                  <button
                    type="button"
                    key={season.id}
                    className={styles.card}
                    onClick={() => navigate(`/season/${season.id}`)}
                    aria-label={`Open ${formatName(season.seasonName)} season`}
                  >
                    <span className={styles.cardTop}>
                      <strong className={styles.name}>
                        {formatName(season.seasonName)}
                      </strong>
                      <span className={styles.cardArrow} aria-hidden="true">
                        →
                      </span>
                    </span>
                    <span className={styles.meta}>
                      {season.matchesPlayed || 0}{" "}
                      {(season.matchesPlayed || 0) === 1 ? "match" : "matches"}
                    </span>
                  </button>
                ))}
              </div>
            )}
        </section>
      </main>

      <CreateSeasonModal
        open={open}
        onClose={onClose}
        onCreated={seasonsQuery.refetch}
        existingSeasons={seasons}
      />
    </>
  );
}
