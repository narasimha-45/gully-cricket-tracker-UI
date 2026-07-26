import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, unwrapApiData } from "../api";
import { getMatch, saveMatch } from "../storage/matchDB";
import { formatName } from "../utils/helpers";
import { normalizeName } from "../utils/matchModel";
import styles from "./TeamPlayers.module.css";

const MIN_PLAYERS = 2;

const getPlayerName = (player) => {
  if (typeof player === "string") return normalizeName(player);
  if (!player || typeof player !== "object") return "";
  return normalizeName(
    player.playerName ||
      player.displayName ||
      player.name ||
      player.player?.playerName ||
      player.player?.name ||
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

export default function TeamPlayers({ teamKey }) {
  const otherTeamKey = teamKey === "teamA" ? "teamB" : "teamA";
  const { seasonId, matchId } = useParams();
  const navigate = useNavigate();
  const searchContainerRef = useRef(null);
  const latestSearchRef = useRef(0);

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;

    const loadMatchAndSquad = async () => {
      try {
        let storedMatch = await getMatch(matchId);
        const storedTeam = storedMatch?.teams?.[teamKey];

        if (
          storedMatch &&
          storedTeam?.id &&
          storedTeam.seasonSquadLoaded !== true
        ) {
          try {
            const response = await api.teams.getTeamSeasonPlayers(
              storedTeam.id,
              seasonId,
            );
            const loadedPlayers = [
              ...new Set(toArray(response).map(getPlayerName).filter(Boolean)),
            ];

            storedMatch = {
              ...storedMatch,
              teams: {
                ...storedMatch.teams,
                [teamKey]: {
                  ...storedTeam,
                  players: loadedPlayers,
                  seasonSquadLoaded: true,
                },
              },
              updatedAt: Date.now(),
            };
            await saveMatch(storedMatch);
          } catch (error) {
            storedMatch = {
              ...storedMatch,
              teams: {
                ...storedMatch.teams,
                [teamKey]: {
                  ...storedTeam,
                  seasonSquadLoaded: true,
                },
              },
            };
            setFeedback(
              "Saved squad could not be loaded. Add players manually below.",
            );
          }
        }

        if (active) setMatch(storedMatch || null);
      } catch {
        if (active) setMatch(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadMatchAndSquad();

    return () => {
      active = false;
    };
  }, [matchId, seasonId, teamKey]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      latestSearchRef.current += 1;
      setResults([]);
      setSearchLoading(false);
      return undefined;
    }

    const requestId = latestSearchRef.current + 1;
    latestSearchRef.current = requestId;

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await api.players.searchPlayers(normalizedQuery);
        if (latestSearchRef.current === requestId) {
          setResults(toArray(response));
        }
      } catch (error) {
        if (latestSearchRef.current === requestId) {
          setResults([]);
          setFeedback("Player search is unavailable. You can still add the typed name.");
        }
      } finally {
        if (latestSearchRef.current === requestId) setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const players = useMemo(
    () =>
      (match?.teams?.[teamKey]?.players || [])
        .map(normalizeName)
        .filter(Boolean),
    [match, teamKey],
  );

  const opponentPlayers = useMemo(
    () =>
      new Set(
        (match?.teams?.[otherTeamKey]?.players || [])
          .map(normalizeName)
          .filter(Boolean),
      ),
    [match, otherTeamKey],
  );

  if (loading) {
    return <p className={styles.stateMessage}>Loading squad…</p>;
  }

  if (!match?.teams?.[teamKey]) {
    return <p className={styles.stateMessage}>Match not found.</p>;
  }

  const team = match.teams[teamKey];
  const canContinue = players.length >= MIN_PLAYERS;
  const isTeamA = teamKey === "teamA";
  const nextPath = isTeamA
    ? `/season/${seasonId}/match/${matchId}/team-b`
    : `/season/${seasonId}/match/${matchId}/toss`;
  const nextLabel = isTeamA
    ? `Next: ${formatName(match.teams[otherTeamKey].name)} →`
    : "Next: Toss Selection →";

  const closeSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const addPlayer = async (rawName) => {
    const player = normalizeName(rawName);
    if (!player) return;

    if (players.includes(player)) {
      setFeedback(`${formatName(player)} is already in this squad.`);
      closeSearch();
      return;
    }

    const updated = {
      ...match,
      teams: {
        ...match.teams,
        [teamKey]: {
          ...team,
          players: [...players, player],
        },
      },
      updatedAt: Date.now(),
    };

    await saveMatch(updated);
    setMatch(updated);
    setFeedback("");
    closeSearch();
  };

  const removePlayer = async (player) => {
    const updated = {
      ...match,
      teams: {
        ...match.teams,
        [teamKey]: {
          ...team,
          players: players.filter((item) => item !== player),
        },
      },
      updatedAt: Date.now(),
    };

    await saveMatch(updated);
    setMatch(updated);
    setFeedback("");
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={styles.backButton}
          aria-label="Go back"
        >
          ←
        </button>
        <div>
          <span className={styles.eyebrow}>Match setup</span>
          <h1>Squad selection</h1>
          <p>{formatName(team.name)}</p>
        </div>
      </header>

      <section className={styles.searchCard} ref={searchContainerRef}>
        <label className={styles.inputLabel} htmlFor={`${teamKey}-player-search`}>
          Find or add player
        </label>
        <div className={styles.inputWrapper}>
          <input
            id={`${teamKey}-player-search`}
            className={styles.searchInput}
            placeholder="Search by name…"
            autoComplete="off"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setFeedback("");
              setIsOpen(true);
            }}
          />
          {searchLoading && <span className={styles.spinner} aria-label="Searching" />}
        </div>

        {feedback && <p className={styles.feedback}>{feedback}</p>}

        {isOpen && query.trim() && (
          <div className={styles.dropdown} role="listbox">
            {results.map((player, index) => {
              const name = getPlayerName(player);
              const disabled = players.includes(name);
              return (
                <button
                  type="button"
                  key={player.id || player._id || `${name}-${index}`}
                  className={styles.dropdownItem}
                  disabled={disabled}
                  onClick={() => addPlayer(name)}
                >
                  <span className={styles.playerIcon}>👤</span>
                  <span>
                    <strong>{formatName(name)}</strong>
                    {(disabled || opponentPlayers.has(name)) && (
                      <small>
                        {disabled
                          ? "Already selected"
                          : "Also in opponent squad · Joker"}
                      </small>
                    )}
                  </span>
                </button>
              );
            })}

            {!searchLoading &&
              !results.some(
                (player) => getPlayerName(player) === normalizeName(query),
              ) && (
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => addPlayer(query)}
                >
                  <span className={styles.newPlayerIcon}>+</span>
                  <span>
                    <strong>Add “{formatName(query)}”</strong>
                    <small>
                      {opponentPlayers.has(normalizeName(query))
                        ? "Also in opponent squad · Add as joker"
                        : "Create or add this player"}
                    </small>
                  </span>
                </button>
              )}
          </div>
        )}
      </section>

      <div className={styles.sectionTitle}>
        <span>Current squad</span>
        <strong>{players.length}</strong>
      </div>

      <section className={styles.playerList} aria-label="Selected players">
        {players.length === 0 ? (
          <div className={styles.emptySquad}>
            <strong>No players added yet</strong>
            <span>Add at least two players to start scoring.</span>
          </div>
        ) : (
          players.map((player) => (
            <div key={player} className={styles.playerRow}>
              <span className={styles.playerAvatar}>
                {player.charAt(0).toUpperCase()}
              </span>
              <strong className={styles.playerName}>{formatName(player)}</strong>
              {opponentPlayers.has(player) && (
                <span className={styles.jokerBadge}>Joker</span>
              )}
              <button
                type="button"
                onClick={() => removePlayer(player)}
                className={styles.removeButton}
                aria-label={`Remove ${formatName(player)}`}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </section>

      <footer className={styles.footer}>
        {!canContinue && (
          <p>
            Add {MIN_PLAYERS - players.length} more player
            {MIN_PLAYERS - players.length === 1 ? "" : "s"} to continue.
          </p>
        )}
        <button
          type="button"
          onClick={() => navigate(nextPath, { replace: true })}
          disabled={!canContinue}
          className={styles.primaryButton}
        >
          {nextLabel}
        </button>
      </footer>
    </main>
  );
}
