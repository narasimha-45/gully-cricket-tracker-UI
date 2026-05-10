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
      if (!res.ok) throw new Error("Failed to fetch seasons");
      const data = await res.json();
      setSeasons(data || []);
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
      {/* 🔵 LOADING (Skeleton instead of text) */}
      {loading && (
        <div className={styles.skeletonWrapper}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={styles.skeletonCard}></div>
          ))}
        </div>
      )}

      {/* 🟡 EMPTY STATE */}
      {!loading && seasons.length === 0 && (
        <div className={styles.empty}>
          <h3>No seasons yet</h3>
          <p>Create your first season and start tracking matches</p>
        </div>
      )}

      {/* 🟢 SEASONS LIST */}
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
                {season.matchCount || 0} matches
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateSeasonModal
        open={open}
        onClose={onClose}
        onCreated={loadSeasons}
      />
    </>
  );
}
