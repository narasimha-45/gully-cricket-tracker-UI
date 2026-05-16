import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./GlobalSearch.module.css";

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

  const API = import.meta.env.VITE_API_BASE_URL;

  // Fetch Results from Real API
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        console.log("Player data:", json.data);
        if (json.success) {  
          setResults(json.data);
        } else {
          setResults({ players: [], teams: [], seasons: [] });
        }
      } catch (err) {
        console.error("Search failed:", err);
        setResults({ players: [], teams: [], seasons: [] });
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (type, id) => {
    setIsOpen(false);
    setQuery("");
    
    // Navigate to the respective profile or page
    if (type === "player") navigate(`/player/${id}`);
    if (type === "team") navigate(`/team/${id}`);
    if (type === "season") navigate(`/season/${id}`);
  };

  const hasResults = results && (results.players.length > 0 || results.teams.length > 0 || results.seasons.length > 0);

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
            <div className={styles.noResults}>No results found for "{query}"</div>
          ) : (
            <>
              {/* PLAYERS */}
              {results.players.length > 0 && (
                <div className={styles.category}>
                  <div className={styles.categoryTitle}>Players</div>
                  {results.players.map(p => (
                    <div key={p.id} className={styles.resultItem} onClick={() => handleSelect("player", p.id)}>
                      <div className={`${styles.resultIcon} ${styles.iconPlayer}`}>👤</div>
                      <div>
                        <div className={styles.resultName}>{p.name}</div>
                        <div className={styles.resultSub}>{p.team}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TEAMS */}
              {results.teams.length > 0 && (
                <div className={styles.category}>
                  <div className={styles.categoryTitle}>Teams</div>
                  {results.teams.map(t => (
                    <div key={t.id} className={styles.resultItem} onClick={() => handleSelect("team", t.id)}>
                      <div className={`${styles.resultIcon} ${styles.iconTeam}`}>🛡️</div>
                      <div>
                        <div className={styles.resultName}>{t.name}</div>
                        <div className={styles.resultSub}>{t.matches} matches played</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SEASONS */}
              {results.seasons.length > 0 && (
                <div className={styles.category}>
                  <div className={styles.categoryTitle}>Seasons</div>
                  {results.seasons.map(s => (
                    <div key={s.id} className={styles.resultItem} onClick={() => handleSelect("season", s.id)}>
                      <div className={`${styles.resultIcon} ${styles.iconSeason}`}>🏆</div>
                      <div>
                        <div className={styles.resultName}>{s.name}</div>
                        <div className={styles.resultSub}>{s.matches} matches</div>
                      </div>
                    </div>
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
