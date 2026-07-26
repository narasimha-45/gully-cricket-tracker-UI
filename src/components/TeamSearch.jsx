import { useEffect, useRef, useState } from "react";
import { api, unwrapApiData } from "../api";
import { normalizeName } from "../utils/matchModel";
import styles from "./TeamSearch.module.css";

const getTeamId = (team) => team?.teamId || team?.id || team?._id || "";
const getTeamName = (team) => team?.teamName || team?.name || "";

const normalizePlayerName = (player) => {
  if (!player) return "";
  if (typeof player === "string") return normalizeName(player);

  const nestedPlayer = player.player || player.playerDto || {};
  return normalizeName(
    player.playerName ||
      player.displayName ||
      player.name ||
      nestedPlayer.playerName ||
      nestedPlayer.displayName ||
      nestedPlayer.name ||
      "",
  );
};

const toArray = (response) => {
  const payload = unwrapApiData(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.players)) return payload.players;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.suggestions)) return payload.suggestions;
  return [];
};

export function TeamSearch({
  label,
  value,
  setValue,
  otherSelectedId,
  seasonId,
  onSquadLoadingChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [squadLoading, setSquadLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const query = value.query?.trim() || "";
    if (!query) {
      setResults([]);
      return undefined;
    }

    let active = true;
    const fetchTeams = async () => {
      try {
        setSearchLoading(true);
        setError("");
        const response = await api.teams.searchTeams(query);
        const otherTeam = normalizeName(otherSelectedId);
        const teams = toArray(response).filter(
          (team) => normalizeName(getTeamName(team)) !== otherTeam,
        );
        if (active) setResults(teams);
      } catch (requestError) {
        if (active) {
          setResults([]);
          setError(
            "Team search is unavailable. You can still create a new team.",
          );
        }
      } finally {
        if (active) setSearchLoading(false);
      }
    };

    const timer = setTimeout(fetchTeams, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value.query, otherSelectedId]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const setSquadLoadingState = (next) => {
    setSquadLoading(next);
    onSquadLoadingChange?.(next);
  };

  const selectExistingTeam = async (team) => {
    const id = getTeamId(team);
    const name = getTeamName(team);

    setIsOpen(false);
    setError("");
    setSquadLoadingState(true);
    setValue({
      id,
      name,
      query: name,
      players: [],
      playersLoaded: false,
    });

    try {
      const response = await api.teams.getTeamSeasonPlayers(id, seasonId);
      const players = [
        ...new Set(toArray(response).map(normalizePlayerName).filter(Boolean)),
      ];

      setValue({
        id,
        name,
        query: name,
        players,
        playersLoaded: true,
      });
    } catch (requestError) {
      setValue({
        id,
        name,
        query: name,
        players: [],
        playersLoaded: true,
      });
      setError(
        "The team was selected, but its saved squad could not be loaded. Players can be added on the next screen.",
      );
    } finally {
      setSquadLoadingState(false);
    }
  };

  const selectNewTeam = () => {
    const name = value.query.trim();
    setValue({
      id: "",
      name,
      query: name,
      players: [],
      playersLoaded: true,
    });
    setIsOpen(false);
    setError("");
  };

  const loadedPlayerCount = Array.isArray(value.players)
    ? value.players.length
    : 0;

  return (
    <div className={styles.container} ref={containerRef}>
      <label className={styles.label}>{label}</label>

      <div className={styles.inputWrapper}>
        <input
          className={styles.input}
          placeholder="Search team name..."
          value={value.query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setValue({
              id: "",
              name: "",
              query: event.target.value,
              players: [],
              playersLoaded: true,
            });
            setError("");
            setIsOpen(true);
          }}
        />

        {value.name && !searchLoading && !squadLoading && (
          <span className={styles.checkIcon}>✓</span>
        )}
        {(searchLoading || squadLoading) && (
          <span className={styles.spinner} aria-label="Loading" />
        )}
      </div>

      {value.id && value.playersLoaded && !squadLoading && (
        <p className={styles.loadedMeta}>
          {loadedPlayerCount === 0
            ? "No saved players found"
            : `${loadedPlayerCount} saved player${loadedPlayerCount === 1 ? "" : "s"} loaded`}
        </p>
      )}
      {squadLoading && (
        <p className={styles.loadedMeta}>Loading saved squad…</p>
      )}
      {error && <p className={styles.error}>{error}</p>}

      {isOpen && value.query.trim() && (
        <div className={styles.dropdown} role="listbox">
          {results.length > 0
            ? results.map((team) => {
                const id = getTeamId(team);
                const name = getTeamName(team);
                return (
                  <button
                    key={id || name}
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => selectExistingTeam(team)}
                  >
                    <span className={styles.teamIcon}>🛡️</span>
                    <span>
                      <strong>{name}</strong>
                      <small>Load this team and its season squad</small>
                    </span>
                  </button>
                );
              })
            : !searchLoading && (
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={selectNewTeam}
                >
                  <span className={styles.newTeamIcon}>+</span>
                  <span>
                    <strong>New team: “{value.query.trim()}”</strong>
                    <small>Create it for this match</small>
                  </span>
                </button>
              )}
        </div>
      )}
    </div>
  );
}
