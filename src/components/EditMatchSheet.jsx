import { useMemo, useState } from "react";
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
import styles from "./EditMatchSheet.module.css";

// Extra ball is always true for wide/no-ball — it's the near-universal
// rule and isn't exposed as a toggle. Extra run stays configurable.
const DEFAULT_RULES = {
  wide: { extraRun: false, extraBall: true },
  noBall: { extraRun: true, extraBall: true },
};

export default function EditMatchSheet({ open, onClose }) {
  const { match, dispatch } = useMatchSession();
  const { live } = match;
  const [openTeam, setOpenTeam] = useState(null);
  const [newPlayer, setNewPlayer] = useState("");
  const innings = match.innings[live.inningsIndex];
  const testMatch = isTestMatch(match);
  const canEditTestFormat = testMatch && live.inningsIndex < 2;
  const testInningsPerTeam = getTestInningsPerTeam(match);

  const usedPlayers = useMemo(() => {
    const used = new Set(
      [
        live.striker,
        live.nonStriker,
        live.bowler,
        ...(live.outBatsmen || []),
      ].filter(Boolean),
    );

    match.innings.forEach((item) => {
      Object.keys(item.battingStats || {}).forEach((player) =>
        used.add(player),
      );
      Object.keys(item.bowlingStats || {}).forEach((player) =>
        used.add(player),
      );
      Object.keys(item.dismissals || {}).forEach((player) => used.add(player));
    });
    return used;
  }, [
    live.striker,
    live.nonStriker,
    live.bowler,
    live.outBatsmen,
    match.innings,
  ]);

  const isPlayerLocked = (player) => usedPlayers.has(player);
  const minOversNeeded = Math.max(1, Math.ceil(innings.balls / 6));

  const updateTestInnings = (inningsPerTeam) => {
    if (!canEditTestFormat) return;
    dispatch({
      type: MATCH_ACTIONS.UPDATE_SETTINGS,
      payload: { testConfig: { ...(match.testConfig || {}), inningsPerTeam } },
    });
  };

  const addPlayer = (teamKey) => {
    const player = normalizeName(newPlayer);
    if (!player) return;
    if (
      (match.teams[teamKey].players || []).some(
        (item) => normalizeName(item) === player,
      )
    ) {
      setNewPlayer("");
      return;
    }
    dispatch({
      type: MATCH_ACTIONS.ADD_TEAM_PLAYER,
      payload: { teamKey, player },
    });
    setNewPlayer("");
  };

  const removePlayer = (teamKey, player) => {
    if (isPlayerLocked(player)) return;
    dispatch({
      type: MATCH_ACTIONS.REMOVE_TEAM_PLAYER,
      payload: { teamKey, player },
    });
  };

  const rules = {
    wide: { ...DEFAULT_RULES.wide, ...(match.rules?.wide || {}) },
    noBall: { ...DEFAULT_RULES.noBall, ...(match.rules?.noBall || {}) },
  };

  const updateRules = (partial) => {
    dispatch({
      type: MATCH_ACTIONS.UPDATE_SETTINGS,
      payload: { rules: { ...rules, ...partial } },
    });
  };

  return (
    <BottomSheetSelector open={open} title="Match settings" onClose={onClose}>
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
            updateRules({ wide: { ...rules.wide, extraRun: checked } })
          }
        />
        <RuleToggle
          title="No-ball gives a run"
          description="Automatically add one penalty run for a no-ball."
          checked={rules.noBall.extraRun}
          onChange={(checked) =>
            updateRules({ noBall: { ...rules.noBall, extraRun: checked } })
          }
        />
      </section>

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
          newPlayer={newPlayer}
          setNewPlayer={setNewPlayer}
        />
      ))}
    </BottomSheetSelector>
  );
}

function OversEditor({ initialOvers, minOversNeeded, dispatch }) {
  const [overs, setOvers] = useState(initialOvers);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasChanged = overs !== initialOvers;

  const updateOvers = (delta) => {
    setOvers((current) => {
      const next = current + delta;
      if (next < minOversNeeded || next > 50) return current;
      return next;
    });
  };

  const requestUpdate = () => {
    if (overs < minOversNeeded || !hasChanged) return;
    setConfirmOpen(true);
  };

  const confirmUpdate = () => {
    dispatch({
      type: MATCH_ACTIONS.UPDATE_SETTINGS,
      payload: { totalOvers: overs },
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

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

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

function TeamEditor({
  teamKey,
  openTeam,
  setOpenTeam,
  match,
  isPlayerLocked,
  removePlayer,
  addPlayer,
  newPlayer,
  setNewPlayer,
}) {
  const team = match.teams[teamKey];
  const isOpen = openTeam === teamKey;
  return (
    <section className={styles.sectionCard}>
      <button
        type="button"
        className={styles.teamHeader}
        onClick={() => setOpenTeam(isOpen ? null : teamKey)}
        aria-expanded={isOpen}
      >
        <span>
          <strong>{formatName(team.name)}</strong>
          <small>{team.players.length} players</small>
        </span>
        <span aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className={styles.teamBody}>
          <div className={styles.playerList}>
            {team.players.map((player) => {
              const locked = isPlayerLocked(player);
              return (
                <div key={player} className={styles.playerRow}>
                  <span>
                    <strong>{formatName(player)}</strong>
                    {locked && <small>Used in this match</small>}
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
          <div className={styles.addRow}>
            <input
              value={newPlayer}
              placeholder="Add a player"
              onChange={(event) => setNewPlayer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addPlayer(teamKey);
              }}
            />
            <button type="button" onClick={() => addPlayer(teamKey)}>
              Add
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
