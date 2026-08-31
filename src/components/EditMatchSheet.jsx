import { useEffect, useMemo, useRef, useState } from "react";
import BottomSheetSelector from "./BottomSheetSelector";
import { formatName } from "../utils/helpers";
import {
  TEST_INNINGS_OPTIONS,
  getTestInningsPerTeam,
  isTestMatch,
  normalizeName,
} from "../utils/matchModel";
import { MATCH_ACTIONS } from "../features/match/state/matchActions";
import { useMatchSession } from "../features/match/state/useMatchSession";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePlayerSearch } from "../hooks/queries";
import styles from "./EditMatchSheet.module.css";

/*
 * Extra ball is always true for wide/no-ball.
 * Extra run stays configurable.
 */
const DEFAULT_RULES = {
  wide: {
    extraRun: false,
    extraBall: true,
  },
  noBall: {
    extraRun: true,
    extraBall: true,
  },
};

const getPlayerName = (player) => {
  if (typeof player === "string") {
    return normalizeName(player);
  }

  if (!player || typeof player !== "object") {
    return "";
  }

  return normalizeName(
    player.playerName ||
      player.displayName ||
      player.name ||
      player.player?.playerName ||
      player.player?.name ||
      "",
  );
};

export default function EditMatchSheet({ open, onClose }) {
  const { match, dispatch } = useMatchSession();

  const { live } = match;

  const [openTeam, setOpenTeam] = useState(null);

  const innings = match.innings[live.inningsIndex];

  const testMatch = isTestMatch(match);

  const canEditTestFormat = testMatch && live.inningsIndex < 2;

  const testInningsPerTeam = getTestInningsPerTeam(match);

  /*
   * Players who already participated in the match
   * cannot be removed.
   */
  const usedPlayers = useMemo(() => {
    const used = new Set(
      [live.striker, live.nonStriker, live.bowler, ...(live.outBatsmen || [])]
        .map(normalizeName)
        .filter(Boolean),
    );

    match.innings.forEach((item) => {
      Object.keys(item.battingStats || {}).forEach((player) => {
        const name = normalizeName(player);

        if (name) {
          used.add(name);
        }
      });

      Object.keys(item.bowlingStats || {}).forEach((player) => {
        const name = normalizeName(player);

        if (name) {
          used.add(name);
        }
      });

      Object.keys(item.dismissals || {}).forEach((player) => {
        const name = normalizeName(player);

        if (name) {
          used.add(name);
        }
      });
    });

    return used;
  }, [
    live.striker,
    live.nonStriker,
    live.bowler,
    live.outBatsmen,
    match.innings,
  ]);

  const isPlayerLocked = (player) => usedPlayers.has(normalizeName(player));

  const minOversNeeded = Math.max(1, Math.ceil(innings.balls / 6));

  const updateTestInnings = (inningsPerTeam) => {
    if (!canEditTestFormat) {
      return;
    }

    dispatch({
      type: MATCH_ACTIONS.UPDATE_SETTINGS,
      payload: {
        testConfig: {
          ...(match.testConfig || {}),
          inningsPerTeam,
        },
      },
    });
  };

  /*
   * Add player.
   *
   * Returns true when successfully added.
   * Returns false when invalid or already selected.
   */
  const addPlayer = (teamKey, rawName) => {
    const player = normalizeName(rawName);

    if (!player) {
      return false;
    }

    const alreadyExists = (match.teams[teamKey].players || []).some(
      (item) => normalizeName(item) === player,
    );

    if (alreadyExists) {
      return false;
    }

    dispatch({
      type: MATCH_ACTIONS.ADD_TEAM_PLAYER,
      payload: {
        teamKey,
        player,
      },
    });

    return true;
  };

  const removePlayer = (teamKey, player) => {
    if (isPlayerLocked(player)) {
      return;
    }

    dispatch({
      type: MATCH_ACTIONS.REMOVE_TEAM_PLAYER,
      payload: {
        teamKey,
        player,
      },
    });
  };

  const rules = {
    wide: {
      ...DEFAULT_RULES.wide,
      ...(match.rules?.wide || {}),
    },
    noBall: {
      ...DEFAULT_RULES.noBall,
      ...(match.rules?.noBall || {}),
    },
  };

  const updateRules = (partial) => {
    dispatch({
      type: MATCH_ACTIONS.UPDATE_SETTINGS,
      payload: {
        rules: {
          ...rules,
          ...partial,
        },
      },
    });
  };

  return (
    <BottomSheetSelector open={open} title="Match settings" onClose={onClose}>
      {/* Match format / overs */}

      <section className={styles.sectionCard}>
        <div className={styles.sectionTitleRow}>
          <div>
            <h3>{testMatch ? "Test format" : "Overs"}</h3>

            <p>
              {testMatch
                ? "Test matches have no over limit."
                : `Minimum allowed now: ${minOversNeeded} overs`}
            </p>
          </div>
        </div>

        {testMatch ? (
          <>
            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={
                  testInningsPerTeam === TEST_INNINGS_OPTIONS.SINGLE
                    ? styles.active
                    : ""
                }
                disabled={!canEditTestFormat}
                onClick={() => updateTestInnings(TEST_INNINGS_OPTIONS.SINGLE)}
              >
                Single innings
              </button>

              <button
                type="button"
                className={
                  testInningsPerTeam === TEST_INNINGS_OPTIONS.DOUBLE
                    ? styles.active
                    : ""
                }
                disabled={!canEditTestFormat}
                onClick={() => updateTestInnings(TEST_INNINGS_OPTIONS.DOUBLE)}
              >
                Double innings
              </button>
            </div>

            <p className={styles.helperNote}>
              {canEditTestFormat
                ? "This option remains editable throughout the first innings."
                : "The innings format is locked after the second innings starts."}
            </p>
          </>
        ) : (
          <OversEditor
            key={`${match.id}:${match.totalOvers}:${open ? "open" : "closed"}`}
            initialOvers={Number(match.totalOvers || 1)}
            minOversNeeded={minOversNeeded}
            dispatch={dispatch}
          />
        )}
      </section>

      {/* Extras */}

      <section className={styles.sectionCard}>
        <div className={styles.sectionTitleRow}>
          <div>
            <h3>Extras rules</h3>

            <p>Control automatic penalty runs for a wide or no-ball.</p>
          </div>
        </div>

        <RuleToggle
          title="Wide gives a run"
          description="Automatically add one penalty run for a wide."
          checked={rules.wide.extraRun}
          onChange={(checked) =>
            updateRules({
              wide: {
                ...rules.wide,
                extraRun: checked,
              },
            })
          }
        />

        <RuleToggle
          title="No-ball gives a run"
          description="Automatically add one penalty run for a no-ball."
          checked={rules.noBall.extraRun}
          onChange={(checked) =>
            updateRules({
              noBall: {
                ...rules.noBall,
                extraRun: checked,
              },
            })
          }
        />
      </section>

      {/* Team players */}

      {["teamA", "teamB"].map((teamKey) => (
        <TeamEditor
          key={teamKey}
          teamKey={teamKey}
          openTeam={openTeam}
          setOpenTeam={setOpenTeam}
          match={match}
          isPlayerLocked={isPlayerLocked}
          removePlayer={removePlayer}
          addPlayer={addPlayer}
        />
      ))}
    </BottomSheetSelector>
  );
}

/* ============================================================
   OVERS EDITOR
   ============================================================ */

function OversEditor({ initialOvers, minOversNeeded, dispatch }) {
  const [overs, setOvers] = useState(initialOvers);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasChanged = overs !== initialOvers;

  const updateOvers = (delta) => {
    setOvers((current) => {
      const next = current + delta;

      if (next < minOversNeeded || next > 50) {
        return current;
      }

      return next;
    });
  };

  const requestUpdate = () => {
    if (overs < minOversNeeded || !hasChanged) {
      return;
    }

    setConfirmOpen(true);
  };

  const confirmUpdate = () => {
    dispatch({
      type: MATCH_ACTIONS.UPDATE_SETTINGS,
      payload: {
        totalOvers: overs,
      },
    });

    setConfirmOpen(false);
  };

  return (
    <>
      <div className={styles.oversContainer}>
        <button
          type="button"
          onClick={() => updateOvers(-1)}
          disabled={overs <= minOversNeeded}
          aria-label="Decrease overs"
        >
          −
        </button>

        <strong>{overs}</strong>

        <button
          type="button"
          onClick={() => updateOvers(1)}
          disabled={overs >= 50}
          aria-label="Increase overs"
        >
          +
        </button>
      </div>

      <button
        type="button"
        className={styles.primaryButton}
        onClick={requestUpdate}
        disabled={!hasChanged}
      >
        Update overs
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Change total overs?"
        message={`This match will be updated to ${overs} overs`}
        confirmLabel="Update overs"
        cancelLabel="Cancel"
        onConfirm={confirmUpdate}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

/* ============================================================
   CONFIRM DIALOG
   ============================================================ */

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className={styles.confirmOverlay}
      role="presentation"
      onClick={onCancel}
    >
      <div
        className={styles.confirmCard}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h4 id="confirm-dialog-title" className={styles.confirmTitle}>
          {title}
        </h4>

        <p id="confirm-dialog-message" className={styles.confirmMessage}>
          {message}
        </p>

        <div className={styles.confirmActions}>
          <button
            type="button"
            className={styles.confirmCancel}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={styles.confirmConfirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RULE TOGGLE
   ============================================================ */

function RuleToggle({ title, description, checked, onChange }) {
  return (
    <label className={styles.settingsRow}>
      <span className={styles.settingCopy}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>

      <span className={styles.switchControl}>
        <input
          className={styles.switchInput}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={title}
        />

        <span className={styles.switchTrack} aria-hidden="true">
          <span className={styles.switchThumb} />
        </span>
      </span>
    </label>
  );
}

/* ============================================================
   TEAM PLAYER EDITOR
   ============================================================ */

function TeamEditor({
  teamKey,
  openTeam,
  setOpenTeam,
  match,
  isPlayerLocked,
  removePlayer,
  addPlayer,
}) {
  const team = match.teams[teamKey];

  const opponentKey = teamKey === "teamA" ? "teamB" : "teamA";

  const expanded = openTeam === teamKey;

  const searchContainerRef = useRef(null);

  const [query, setQuery] = useState("");

  const [searchOpen, setSearchOpen] = useState(false);

  const [feedback, setFeedback] = useState("");

  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  const playersQuery = usePlayerSearch(debouncedQuery);

  const results = playersQuery.data || [];

  const searchLoading = Boolean(
    query.trim().length >= 2 &&
    (playersQuery.isLoading || debouncedQuery !== query.trim()),
  );

  /*
   * Current team's players.
   */
  const currentPlayers = useMemo(
    () => new Set((team.players || []).map(normalizeName).filter(Boolean)),
    [team.players],
  );

  /*
   * Opponent squad.
   *
   * If a suggested player is already
   * in the opponent team, we still allow
   * selecting them as a Joker.
   */
  const opponentPlayers = useMemo(
    () =>
      new Set(
        (match.teams[opponentKey]?.players || [])
          .map(normalizeName)
          .filter(Boolean),
      ),
    [match.teams, opponentKey],
  );

  const normalizedQuery = normalizeName(query);

  const exactPlayerExists = results.some(
    (player) => getPlayerName(player) === normalizedQuery,
  );

  /*
   * Close suggestion list when clicking
   * outside the search area.
   */
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, []);

  /*
   * Reset search when collapsing
   * this team.
   */
  useEffect(() => {
    if (!expanded) {
      setQuery("");
      setFeedback("");
      setSearchOpen(false);
    }
  }, [expanded]);

  const handleAddPlayer = (rawName) => {
    const player = normalizeName(rawName);

    if (!player) {
      return;
    }

    if (currentPlayers.has(player)) {
      setFeedback(`${formatName(player)} is already in this squad.`);

      return;
    }

    const added = addPlayer(teamKey, player);

    if (!added) {
      return;
    }

    setQuery("");
    setFeedback("");
    setSearchOpen(false);
  };

  return (
    <section className={styles.sectionCard}>
      {/* Team header */}

      <button
        type="button"
        className={styles.teamHeader}
        onClick={() => setOpenTeam(expanded ? null : teamKey)}
        aria-expanded={expanded}
      >
        <span>
          <strong>{formatName(team.name)}</strong>

          <small>
            {(team.players || []).length} player
            {(team.players || []).length === 1 ? "" : "s"}
          </small>
        </span>

        <span className={styles.expandIcon} aria-hidden="true">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className={styles.teamBody}>
          {/* Existing squad */}

          <div className={styles.playerList}>
            {(team.players || []).map((player) => {
              const normalizedPlayer = normalizeName(player);

              const locked = isPlayerLocked(player);

              const joker = opponentPlayers.has(normalizedPlayer);

              return (
                <div key={player} className={styles.playerRow}>
                  <span>
                    <strong>{formatName(player)}</strong>

                    {locked && <small>Used in this match</small>}

                    {!locked && joker && (
                      <small>Also in opponent squad · Joker</small>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => removePlayer(teamKey, player)}
                    disabled={locked}
                  >
                    {locked ? "Locked" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Search / add player */}

          <div className={styles.playerSearch} ref={searchContainerRef}>
            <div className={styles.addRow}>
              <div className={styles.addInputWrapper}>
                <input
                  value={query}
                  placeholder="Search or add player..."
                  autoComplete="off"
                  onFocus={() => {
                    setSearchOpen(true);
                  }}
                  onChange={(event) => {
                    setQuery(event.target.value);

                    setFeedback("");

                    setSearchOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();

                      handleAddPlayer(query);
                    }

                    if (event.key === "Escape") {
                      setSearchOpen(false);
                    }
                  }}
                />

                {searchLoading && (
                  <span
                    className={styles.searchSpinner}
                    aria-label="Searching players"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => handleAddPlayer(query)}
                disabled={
                  !normalizedQuery || currentPlayers.has(normalizedQuery)
                }
              >
                Add
              </button>
            </div>

            {/* Search feedback */}

            {(feedback || playersQuery.isError) && (
              <p className={styles.searchMessage} role="status">
                {feedback ||
                  "Player search is unavailable. You can still add the typed name."}
              </p>
            )}

            {/* Suggestions */}

            {searchOpen && query.trim() && (
              <div
                className={styles.playerSuggestions}
                role="listbox"
                aria-label="Player suggestions"
              >
                {results.map((player, index) => {
                  const name = getPlayerName(player);

                  if (!name) {
                    return null;
                  }

                  const alreadySelected = currentPlayers.has(name);

                  const opponentPlayer = opponentPlayers.has(name);

                  return (
                    <button
                      key={player.id || player._id || `${name}-${index}`}
                      type="button"
                      className={styles.suggestionItem}
                      disabled={alreadySelected}
                      onClick={() => handleAddPlayer(name)}
                    >
                      <span
                        className={styles.suggestionIcon}
                        aria-hidden="true"
                      >
                        👤
                      </span>

                      <span className={styles.suggestionCopy}>
                        <strong>{formatName(name)}</strong>

                        {alreadySelected && <small>Already selected</small>}

                        {!alreadySelected && opponentPlayer && (
                          <small>Also in opponent squad · Joker</small>
                        )}

                        {!alreadySelected && !opponentPlayer && (
                          <small>Select existing player</small>
                        )}
                      </span>
                    </button>
                  );
                })}

                {/* Create typed player */}

                {!searchLoading &&
                  normalizedQuery &&
                  !exactPlayerExists &&
                  !currentPlayers.has(normalizedQuery) && (
                    <button
                      type="button"
                      className={styles.suggestionItem}
                      onClick={() => handleAddPlayer(query)}
                    >
                      <span className={styles.newPlayerIcon} aria-hidden="true">
                        +
                      </span>

                      <span className={styles.suggestionCopy}>
                        <strong>Add “{formatName(query)}”</strong>

                        <small>
                          {opponentPlayers.has(normalizedQuery)
                            ? "Also in opponent squad · Add as Joker"
                            : "Create or add this player"}
                        </small>
                      </span>
                    </button>
                  )}

                {searchLoading && (
                  <div className={styles.searchingRow}>Searching players…</div>
                )}

                {!searchLoading &&
                  results.length === 0 &&
                  exactPlayerExists && (
                    <div className={styles.searchingRow}>
                      No other players found
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
