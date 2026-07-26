import { useEffect, useMemo, useState } from "react";
import { saveMatch } from "../storage/matchDB";
import BottomSheetSelector from "./BottomSheetSelector";
import { formatName } from "../utils/helpers";
import {
  TEST_INNINGS_OPTIONS,
  getTestInningsPerTeam,
  isTestMatch,
  normalizeName,
} from "../utils/matchModel";
import styles from "./EditMatchSheet.module.css";

const DEFAULT_RULES = {
  wide: { extraRun: false, extraBall: true },
  noBall: { extraRun: true, extraBall: true },
};

export default function EditMatchSheet({ open, onClose, match, onSave }) {
  const { live } = match;
  const [openTeam, setOpenTeam] = useState(null);
  const [newPlayer, setNewPlayer] = useState("");
  const [overs, setOvers] = useState(Number(match.totalOvers || 1));

  useEffect(() => {
    if (open) setOvers(Number(match.totalOvers || 1));
  }, [match.totalOvers, open]);

  const innings = match.innings[live.inningsIndex];
  const testMatch = isTestMatch(match);
  const canEditTestFormat = testMatch && live.inningsIndex === 0;
  const testInningsPerTeam = getTestInningsPerTeam(match);

  const usedPlayers = useMemo(() => {
    const used = new Set([
      live.striker,
      live.nonStriker,
      live.bowler,
      ...(live.outBatsmen || []),
    ].filter(Boolean));

    match.innings.forEach((item) => {
      Object.keys(item.battingStats || {}).forEach((player) => used.add(player));
      Object.keys(item.bowlingStats || {}).forEach((player) => used.add(player));
      Object.keys(item.dismissals || {}).forEach((player) => used.add(player));
    });

    return used;
  }, [live, match.innings]);

  const isPlayerLocked = (player) => usedPlayers.has(player);

  const save = (updated) => {
    saveMatch(updated);
    onSave(updated);
  };

  const minOversNeeded = Math.max(1, Math.ceil(innings.balls / 6));

  const updateOvers = (delta) => {
    setOvers((current) => {
      const next = current + delta;
      if (next < minOversNeeded || next > 50) return current;
      return next;
    });
  };

  const applyOvers = () => {
    if (testMatch || overs < minOversNeeded) return;
    save({ ...match, totalOvers: overs, updatedAt: Date.now() });
  };

  const updateTestInnings = (inningsPerTeam) => {
    if (!canEditTestFormat) return;
    save({
      ...match,
      testConfig: { inningsPerTeam },
      updatedAt: Date.now(),
    });
  };

  const addPlayer = (teamKey) => {
    const player = normalizeName(newPlayer);
    if (!player) return;

    const currentPlayers = match.teams[teamKey].players || [];
    if (currentPlayers.some((item) => normalizeName(item) === player)) {
      setNewPlayer("");
      return;
    }

    save({
      ...match,
      teams: {
        ...match.teams,
        [teamKey]: {
          ...match.teams[teamKey],
          players: [...currentPlayers, player],
        },
      },
      updatedAt: Date.now(),
    });
    setNewPlayer("");
  };

  const removePlayer = (teamKey, player) => {
    if (isPlayerLocked(player)) return;

    save({
      ...match,
      teams: {
        ...match.teams,
        [teamKey]: {
          ...match.teams[teamKey],
          players: match.teams[teamKey].players.filter((item) => item !== player),
        },
      },
      updatedAt: Date.now(),
    });
  };

  const rules = {
    wide: { ...DEFAULT_RULES.wide, ...(match.rules?.wide || {}) },
    noBall: { ...DEFAULT_RULES.noBall, ...(match.rules?.noBall || {}) },
  };

  const updateRules = (partial) => {
    save({
      ...match,
      rules: { ...rules, ...partial },
      updatedAt: Date.now(),
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
            <button type="button" className={styles.primaryButton} onClick={applyOvers}>
              Update overs
            </button>
          </>
        )}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionTitleRow}>
          <div>
            <h3>Extras rules</h3>
            <p>Control automatic penalty runs.</p>
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

      {(["teamA", "teamB"]).map((teamKey) => (
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

function RuleToggle({ title, description, checked, onChange }) {
  return (
    <label className={styles.settingsRow}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
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
