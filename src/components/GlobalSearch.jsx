import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useGlobalSearch } from "../hooks/queries";
import styles from "./GlobalSearch.module.css";

const EMPTY = Object.freeze({ players: [], teams: [], seasons: [] });

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const searchQuery = useGlobalSearch(debouncedQuery);

  const results = useMemo(
    () => ({
      players: Array.isArray(searchQuery.data?.players)
        ? searchQuery.data.players
        : [],
      teams: Array.isArray(searchQuery.data?.teams)
        ? searchQuery.data.teams
        : [],
      seasons: Array.isArray(searchQuery.data?.seasons)
        ? searchQuery.data.seasons
        : [],
    }),
    [searchQuery.data],
  );

  useEffect(() => {
    const handleOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target))
        setIsOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  const choose = (path) => {
    setIsOpen(false);
    setQuery("");
    navigate(path);
  };

  const hasResults =
    results.players.length + results.teams.length + results.seasons.length > 0;
  const canSearch = query.trim().length >= 2;
  const searching =
    canSearch && (searchQuery.isLoading || debouncedQuery !== query.trim());

  return (
    <div className={styles.container} ref={searchRef}>
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon} aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          className={styles.input}
          placeholder="Search players, teams or seasons"
          value={query}
          autoComplete="off"
          aria-label="Search players, teams or seasons"
          aria-expanded={isOpen && canSearch}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
        />
      </div>

      {isOpen && query.trim() && (
        <div
          className={styles.dropdown}
          role="region"
          aria-label="Search results"
        >
          {!canSearch ? (
            <div className={styles.noResults}>Type at least 2 characters</div>
          ) : searching ? (
            <div className={styles.noResults}>Searching…</div>
          ) : searchQuery.isError ? (
            <div className={styles.noResults}>
              Search is unavailable. Try again.
            </div>
          ) : !hasResults ? (
            <div className={styles.noResults}>
              No results for “{query.trim()}”
            </div>
          ) : (
            <>
              <ResultGroup
                title="Players"
                rows={results.players}
                render={(player) => ({
                  key: player.playerId,
                  icon: "👤",
                  title: player.playerName,
                  meta: `${player.matchesPlayed || 0} matches`,
                  onClick: () =>
                    choose(`/player/${encodeURIComponent(player.playerId)}`),
                })}
              />
              <ResultGroup
                title="Teams"
                rows={results.teams}
                render={(team) => ({
                  key: team.teamId,
                  icon: "🛡️",
                  title: team.teamName,
                  meta: "Team profile",
                  onClick: () =>
                    choose(`/team/${encodeURIComponent(team.teamId)}`),
                })}
              />
              <ResultGroup
                title="Seasons"
                rows={results.seasons}
                render={(season) => ({
                  key: season.seasonId,
                  icon: "🏆",
                  title: season.seasonName,
                  meta: `${season.totalMatches || 0} matches`,
                  onClick: () =>
                    choose(`/season/${encodeURIComponent(season.seasonId)}`),
                })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, rows = EMPTY.players, render }) {
  if (!rows.length) return null;
  return (
    <div className={styles.category}>
      <div className={styles.categoryTitle}>{title}</div>
      {rows.map((row) => {
        const item = render(row);
        return (
          <button
            key={item.key}
            type="button"
            className={styles.resultItem}
            onClick={item.onClick}
          >
            <span className={styles.resultIcon} aria-hidden="true">
              {item.icon}
            </span>
            <span className={styles.resultCopy}>
              <strong className={styles.resultName}>{item.title}</strong>
              <small>{item.meta}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
