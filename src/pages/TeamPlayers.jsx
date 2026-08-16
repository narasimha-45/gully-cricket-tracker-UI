import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, unwrapApiData } from "../api";
import {
  MatchSessionProvider,
  useMatchSession,
} from "../features/match/state/MatchSessionContext";
import { MATCH_ACTIONS } from "../features/match/state/matchActions";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePlayerSearch } from "../hooks/queries";
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
  const { matchId } = useParams();
  return (
    <MatchSessionProvider matchId={matchId}>
      <TeamPlayersContent teamKey={teamKey} />
    </MatchSessionProvider>
  );
}

function TeamPlayersContent({ teamKey }) {
  const otherTeamKey = teamKey === "teamA" ? "teamB" : "teamA";
  const { seasonId, matchId } = useParams();
  const navigate = useNavigate();
  const searchContainerRef = useRef(null);
  const squadRequestRef = useRef(null);
  const {
    phase,
    match,
    error,
    dispatch,
    persistReplacement,
  } = useMatchSession();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [squadLoading, setSquadLoading] = useState(false);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (phase !== "ready" || !match?.teams?.[teamKey]) return undefined;
    const team = match.teams[teamKey];
    if (!team.id || team.seasonSquadLoaded === true) return undefined;

    const requestKey = `${match.id}:${teamKey}:${team.id}:${seasonId}`;
    if (squadRequestRef.current === requestKey) return undefined;
    squadRequestRef.current = requestKey;
    let active = true;
    const controller = new AbortController();

    setSquadLoading(true);
    api.teams
      .getTeamSeasonPlayers(team.id, seasonId, { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        const players = [
          ...new Set(toArray(response).map(getPlayerName).filter(Boolean)),
        ];
        dispatch({
          type: MATCH_ACTIONS.REPLACE_MATCH,
          payload: {
            ...match,
            teams: {
              ...match.teams,
              [teamKey]: {
                ...team,
                players,
                seasonSquadLoaded: true,
              },
            },
            updatedAt: Date.now(),
          },
        });
        setFeedback("");
      })
      .catch((requestError) => {
        if (!active || requestError?.message === "Request cancelled") return;
        setFeedback(
          "Saved squad could not be loaded. Add players manually or reopen this screen to retry.",
        );
      })
      .finally(() => {
        if (active) setSquadLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [dispatch, match, phase, seasonId, teamKey]);

  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const playersQuery = usePlayerSearch(debouncedQuery);
  const results = playersQuery.data || [];
  const searchLoading = Boolean(
    query.trim().length >= 2 &&
      (playersQuery.isLoading || debouncedQuery !== query.trim()),
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
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

  if (phase === "loading") {
    return <p className={styles.stateMessage}>Loading squad…</p>;
  }

  if (phase === "error" || !match?.teams?.[teamKey]) {
    return (
      <p className={styles.stateMessage} role="alert">
        {error?.message || "Match not found on this device."}
      </p>
    );
  }

  const team = match.teams[teamKey];
  const canContinue = players.length >= MIN_PLAYERS && !squadLoading;
  const isTeamA = teamKey === "teamA";
  const nextPath = isTeamA
    ? `/season/${seasonId}/match/${matchId}/team-b`
    : `/season/${seasonId}/match/${matchId}/toss`;
  const nextLabel = isTeamA
    ? `Next: ${formatName(match.teams[otherTeamKey].name)} →`
    : "Next: Toss Selection →";

  const closeSearch = () => {
    setQuery("");
    setIsOpen(false);
  };

  const addPlayer = (rawName) => {
    const player = normalizeName(rawName);
    if (!player) return;

    if (players.includes(player)) {
      setFeedback(`${formatName(player)} is already in this squad.`);
      closeSearch();
      return;
    }

    dispatch({
      type: MATCH_ACTIONS.ADD_TEAM_PLAYER,
      payload: { teamKey, player },
    });
    setFeedback("");
    closeSearch();
  };

  const removePlayer = (player) => {
    dispatch({
      type: MATCH_ACTIONS.REMOVE_TEAM_PLAYER,
      payload: { teamKey, player },
    });
    setFeedback("");
  };

  const continueSetup = async () => {
    if (!canContinue || continuing) return;
    setContinuing(true);
    try {
      // Explicitly await the latest state before navigating to the next route.
      await persistReplacement(match);
      navigate(nextPath, { replace: true });
    } catch (saveError) {
      setFeedback(
        saveError?.message || "Could not save this squad on the device.",
      );
    } finally {
      setContinuing(false);
    }
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

        {(feedback || playersQuery.isError) && (
          <p className={styles.feedback} role="status">
            {feedback ||
              "Player search is unavailable. You can still add the typed name."}
          </p>
        )}

        {isOpen && query.trim() && (
          <div className={styles.dropdown} role="listbox" aria-label="Player suggestions">
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
                  <span className={styles.playerIcon} aria-hidden="true">👤</span>
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
                  <span className={styles.newPlayerIcon} aria-hidden="true">+</span>
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
              <span className={styles.playerAvatar} aria-hidden="true">
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
        {!canContinue && !squadLoading && (
          <p>
            Add {Math.max(0, MIN_PLAYERS - players.length)} more player
            {MIN_PLAYERS - players.length === 1 ? "" : "s"} to continue.
          </p>
        )}
        {squadLoading && <p>Loading the saved season squad…</p>}
        <button
          type="button"
          onClick={continueSetup}
          disabled={!canContinue || continuing}
          className={styles.primaryButton}
        >
          {continuing ? "Saving…" : nextLabel}
        </button>
      </footer>
    </main>
  );
}
