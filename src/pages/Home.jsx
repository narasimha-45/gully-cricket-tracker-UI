import CreateSeasonModal from "../components/CreateSeasonModal";
import GlobalSearch from "../components/GlobalSearch";
import LoadingState from "../components/common/LoadingState";
import styles from "./Home.module.css";
import { useNavigate } from "react-router-dom";
import { formatName } from "../utils/helpers";
import { useSeasons } from "../hooks/queries";

export default function Home({ open, onClose }) {
  const { data: seasons = [], isLoading, refetch } = useSeasons();
  const navigate = useNavigate();

  return (
    <>
      <div className={styles.page}>
        {/* HERO */}
        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            <div>
              <p className={styles.heroTag}>🏏 Gully Cricket</p>

              <h1 className={styles.heroTitle}>Cricket Scoring Reimagined</h1>
            </div>
          </div>

          <p className={styles.heroSubtitle}>
            Create seasons, track matches, and dominate the leaderboards.
          </p>
        </div>

        {/* GLOBAL SEARCH */}
        <GlobalSearch />

        {/* DASHBOARD CARDS */}
        <div className={styles.dashboardGrid}>
          {/* SEASONS */}
          <div
            className={styles.dashboardCard}
            onClick={() => {
              document.getElementById("seasons-section")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
          >
            <div className={styles.cardIcon}>🏆</div>

            <div>
              <h3>Seasons</h3>

              <p>Manage tournaments and matches</p>
            </div>
          </div>

          {/* INSIGHTS HUB */}
          <div
            className={styles.leaderboardCard}
            onClick={() => navigate("/insights")}
          >
            <div className={styles.cardIcon}>📊</div>

            <div>
              <h3>Global Stats & Matchups</h3>

              <p>Overall rankings & analytics</p>
            </div>
          </div>
        </div>

        {/* SEASONS */}
        <div id="seasons-section" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Your Seasons</h2>

            <span>{seasons.length}</span>
          </div>

          {/* LOADING */}
          {isLoading && <LoadingState label="Loading seasons…" />}

          {/* EMPTY */}
          {!isLoading && seasons.length === 0 && (
            <div className={styles.empty}>
              <h3>No seasons yet</h3>

              <p>Create your first season and start scoring matches.</p>
            </div>
          )}

          {/* LIST */}
          {!isLoading && seasons.length > 0 && (
            <div className={styles.list}>
              {seasons.map((season) => (
                <div
                  key={season.id}
                  className={styles.card}
                  onClick={() => {
                    const stored = JSON.parse(
                      sessionStorage.getItem("seasons") || "{}",
                    );

                    stored[season.id] = season.seasonName;

                    sessionStorage.setItem("seasons", JSON.stringify(stored));

                    navigate(`/season/${season.id}`);
                  }}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.name}>
                      {formatName(season.seasonName)}
                    </span>
                  </div>

                  <div className={styles.meta}>
                    {season.matchesPlayed || 0} matches
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateSeasonModal
        open={open}
        onClose={onClose}
        onCreated={refetch}
        existingSeasons={seasons}
      />
    </>
  );
}
