import { useEffect, useState } from "react";
import CreateSeasonModal from "../components/CreateSeasonModal";
import styles from "./Home.module.css";
import { useNavigate } from "react-router-dom";

export default function Home({ open, onClose }) {
  const [seasons, setSeasons] = useState([]);

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const API = import.meta.env.VITE_API_BASE_URL;

  const loadSeasons = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API}/api/seasons`);

      if (!res.ok) {
        throw new Error("Failed to fetch seasons");
      }

      const result = await res.json();

      console.log("Fetched seasons:", result);

      setSeasons(result.data || []);
    } catch (err) {
      console.error(err);
      setSeasons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeasons();
  }, []);

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

          {/* LEADERBOARDS */}
          <div
            className={styles.leaderboardCard}
            onClick={() => navigate("/leaderboards")}
          >
            <div className={styles.cardIcon}>📊</div>

            <div>
              <h3>Leaderboards</h3>

              <p>Overall player rankings & stats</p>
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
          {loading && (
            <div className={styles.skeletonWrapper}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className={styles.skeletonCard}></div>
              ))}
            </div>
          )}

          {/* EMPTY */}
          {!loading && seasons.length === 0 && (
            <div className={styles.empty}>
              <h3>No seasons yet</h3>

              <p>Create your first season and start scoring matches.</p>
            </div>
          )}

          {/* LIST */}
          {!loading && seasons.length > 0 && (
            <div className={styles.list}>
              {seasons.map((season) => (
                <div
                  key={season._id}
                  className={styles.card}
                  onClick={() => {
                    const stored = JSON.parse(
                      sessionStorage.getItem("seasons") || "{}",
                    );

                    stored[season._id] = season.seasonName;

                    sessionStorage.setItem("seasons", JSON.stringify(stored));

                    navigate(`/season/${season._id}`);
                  }}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.name}>{season.seasonName}</span>
                  </div>

                  <div className={styles.meta}>
                    {season.matchesCount || 0} matches
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
        onCreated={loadSeasons}
      />
    </>
  );
}
