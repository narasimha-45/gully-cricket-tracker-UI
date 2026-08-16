import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./GlobalSearch.module.css";
import { api } from "../api";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Results from Real API
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    let active = true;
    const fetchResults = async () => {
      try {
        setLoading(true);
        const json = await api.search.globalSearch(query.trim());
        if (active) setResults(json || { players: [], teams: [], seasons: [] });
      } catch (err) {
        if (active) setResults({ players: [], teams: [], seasons: [] });
      } finally {
        if (active) setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => {
      active = false;
      clearTimeout(debounce);
    };
  }, [query]);

  const handleSelect = (type, id) => {
    setIsOpen(false);
    setQuery("");

    // Navigate to the respective profile or page
    if (type === "player") navigate(`/player/${id}`);
    if (type === "team") navigate(`/team/${id}`);
    if (type === "season") navigate(`/season/${id}`);
  };

  const hasResults =
    results &&
    (results.players.length > 0 ||
      results.teams.length > 0 ||
      results.seasons.length > 0);

  return (
    <div className={styles.container} ref={searchRef}>
      <div className={styles.searchWrapper}>
        <div className={styles.searchIcon}>🔍</div>
        <input
          type="text"
          className={styles.input}
          placeholder="Search team, player, or season..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
        />
      </div>

      {isOpen && query.trim() && (
        <div className={styles.dropdown}>
          {loading ? (
            <div className={styles.noResults}>Searching...</div>
          ) : !hasResults ? (
            <div className={styles.noResults}>
              No results found for "{query}"
            </div>
          ) : (
            <>
              {/* PLAYERS */}
              {results.players.length > 0 && (
                <div className={styles.category}>
                  <div className={styles.categoryTitle}>Players</div>
                  {results.players.map((p) => (
                    <button
                      type="button"
                      key={p.playerId}
                      className={styles.resultItem}
                      onClick={() => handleSelect("player", p.playerId)}
                    >
                      <div
                        className={`${styles.resultIcon} ${styles.iconPlayer}`}
                      >
                        👤
                      </div>
                      <div>
                        <div className={styles.resultName}>{p.playerName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* TEAMS */}
              {results.teams.length > 0 && (
                <div className={styles.category}>
                  <div className={styles.categoryTitle}>Teams</div>
                  {results.teams.map((t) => (
                    <button
                      type="button"
                      key={t.teamId}
                      className={styles.resultItem}
                      onClick={() => handleSelect("team", t.teamId)}
                    >
                      <div
                        className={`${styles.resultIcon} ${styles.iconTeam}`}
                      >
                        🛡️
                      </div>
                      <div>
                        <div className={styles.resultName}>{t.teamName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* SEASONS */}
              {results.seasons.length > 0 && (
                <div className={styles.category}>
                  <div className={styles.categoryTitle}>Seasons</div>
                  {results.seasons.map((s) => (
                    <button
                      type="button"
                      key={s.seasonId}
                      className={styles.resultItem}
                      onClick={() => handleSelect("season", s.seasonId)}
                    >
                      <div
                        className={`${styles.resultIcon} ${styles.iconSeason}`}
                      >
                        🏆
                      </div>
                      <div>
                        <div className={styles.resultName}>{s.seasonName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
