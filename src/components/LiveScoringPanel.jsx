import { useMemo, useState } from "react";
import BottomSheetSelector from "./BottomSheetSelector";
import TestMatchControls from "./TestMatchControls";
import WicketSheet from "./WicketSheet";
import { formatName } from "../utils/helpers";
import {
  applyRun,
  changeBowler,
  retireBatsman,
  selectLivePlayer,
  switchStrike,
} from "../utils/matchEvents";
import { getPlayersForTeam, isTestMatch, sameName } from "../utils/matchModel";
import { getBallPresentation } from "../utils/matchPresentation";
import { getCurrentPartnership } from "../utils/partnerships";
import { renderBatStats, renderBowlStats } from "../utils/renderStats";
import { undoLast } from "../utils/undos";
import styles from "./LiveScoringPanel.module.css";

const initialWicketUi = {
  open: false,
  type: null,
  helper: null,
  runOut: { outBatsman: null, runs: 0 },
};

export default function LiveScoringPanel({
  match,
  setMatch,
  extraMode,
  setExtraMode,
}) {
  const [sheet, setSheet] = useState(null);
  const [wicketUI, setWicketUI] = useState(initialWicketUi);

  const { innings, live } = useMemo(() => {
    const current = match.innings[match.live.inningsIndex];
    return { innings: current, live: match.live };
  }, [match]);

  const bowlingPlayers = useMemo(
    () => getPlayersForTeam(match, innings.bowlingTeam),
    [match, innings.bowlingTeam],
  );

  const eligibleBatsmen = useMemo(() => {
    return getPlayersForTeam(match, innings.battingTeam).filter(
      (player) =>
        !(live.outBatsmen || []).some((out) => sameName(out, player)) &&
        !sameName(player, live.striker) &&
        !sameName(player, live.nonStriker) &&
        !sameName(player, live.bowler),
    );
  }, [
    match,
    innings.battingTeam,
    live.outBatsmen,
    live.striker,
    live.nonStriker,
    live.bowler,
  ]);

  const bowlerBlockedBatter = useMemo(
    () =>
      getPlayersForTeam(match, innings.battingTeam).find(
        (player) =>
          sameName(player, live.bowler) &&
          !(live.outBatsmen || []).some((out) => sameName(out, player)) &&
          !sameName(player, live.striker) &&
          !sameName(player, live.nonStriker),
      ),
    [
      match,
      innings.battingTeam,
      live.bowler,
      live.outBatsmen,
      live.striker,
      live.nonStriker,
    ],
  );

  const canScore = Boolean(live.striker && live.nonStriker && live.bowler);
  const historyCount = live.history?.length || 0;
  const partnership = getCurrentPartnership(innings);

  const choosePlayer = (role, player) => {
    selectLivePlayer({ role, player, match, setMatch, extraMode });
    setSheet(null);
  };

  const chooseReplacementBowler = (player) => {
    changeBowler({ player, match, setMatch, extraMode });
    setSheet(null);
  };

  const toggleExtra = (mode) => {
    if (!canScore) return;
    setExtraMode((current) => (current === mode ? "NORMAL" : mode));
  };

  return (
    <>
      {!canScore && (
        <div className={styles.scoringHint}>
          {bowlerBlockedBatter && (!live.striker || !live.nonStriker)
            ? `${formatName(bowlerBlockedBatter)} is currently bowling. Change the bowler before selecting this joker to bat.`
            : "Select two batters and a bowler before recording a ball."}
        </div>
      )}

      <section className={styles.card}>
        <div className={styles.tableHeader}>
          <span>Batter</span>
          <span>R</span>
          <span>B</span>
          <span>4s</span>
          <span>6s</span>
        </div>
        {[live.striker, live.nonStriker].map((name, index) => (
          <div
            key={index === 0 ? "striker" : "non-striker"}
            className={styles.tableRow}
          >
            <button
              type="button"
              className={!name ? styles.selectablePlayer : styles.playerName}
              onClick={() =>
                !name && setSheet(index === 0 ? "striker" : "nonStriker")
              }
              disabled={Boolean(name)}
            >
              {name
                ? `${formatName(name)}${index === 0 ? " *" : ""}`
                : "Select batter"}
            </button>
            {renderBatStats(innings, name)}
          </div>
        ))}
      </section>

      {live.striker && live.nonStriker && (
        <section className={styles.partnershipCard}>
          <span className={styles.partnershipLabel}>Partnership</span>
          <div className={styles.partnershipMain}>
            <span className={styles.partnershipRuns}>
              {partnership?.runs ?? 0}
              <span className={styles.partnershipBalls}>
                {` (${partnership?.balls ?? 0})`}
              </span>
            </span>
            <div className={styles.partnershipBatters}>
              {partnership
                ? Object.entries(partnership.contributions).map(
                    ([name, contribution]) => (
                      <span key={name} className={styles.partnershipBatter}>
                        {formatName(name)}: {contribution.runs} ({contribution.balls})
                      </span>
                    ),
                  )
                : [live.striker, live.nonStriker].map((name) => (
                    <span key={name} className={styles.partnershipBatter}>
                      {formatName(name)}: 0 (0)
                    </span>
                  ))}
            </div>
          </div>
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.tableHeader}>
          <span>Bowler</span>
          <span>O</span>
          <span>M</span>
          <span>R</span>
          <span>W</span>
        </div>
        <div className={styles.tableRow}>
          <button
            type="button"
            className={!live.bowler ? styles.selectablePlayer : styles.playerName}
            onClick={() => !live.bowler && setSheet("bowler")}
            disabled={Boolean(live.bowler)}
          >
            {live.bowler ? `${formatName(live.bowler)} *` : "Select bowler"}
          </button>
          {renderBowlStats(innings, live.bowler)}
        </div>
        <div className={styles.bowlerActionRow}>
          <button
            type="button"
            className={styles.changeBowlerButton}
            disabled={!live.bowler || bowlingPlayers.length < 2}
            onClick={() => setSheet("changeBowler")}
          >
            Change bowler
          </button>
        </div>
      </section>

      <section className={styles.overBox}>
        <p className={styles.overLabel}>This over</p>
        <div className={styles.overBalls}>
          {(innings.thisOver || []).length === 0 && (
            <span className={styles.emptyOver}>No balls yet</span>
          )}
          {(innings.thisOver || []).map((ball, index) => {
            const presentation = getBallPresentation(ball, match);
            return (
              <span
                key={`${innings.balls}-${index}`}
                className={`${styles.ballChip} ${styles[presentation.kind]}`}
              >
                {presentation.label}
              </span>
            );
          })}
        </div>
      </section>

      <section
        className={`${styles.keypad} ${!canScore ? styles.keypadDisabled : ""}`}
      >
        {[1, 2, 3, 4, 6, 0].map((run) => (
          <button
            key={run}
            type="button"
            className={styles.keyButton}
            disabled={!canScore}
            onClick={() =>
              applyRun({
                runs: run,
                match,
                setMatch,
                extraMode,
                setExtraMode,
              })
            }
          >
            {run}
          </button>
        ))}

        <button
          type="button"
          className={`${styles.keyButton} ${styles.extraButton} ${
            extraMode === "WIDE" ? styles.extraActive : ""
          }`}
          disabled={!canScore}
          onClick={() => toggleExtra("WIDE")}
        >
          Wd
        </button>
        <button
          type="button"
          className={`${styles.keyButton} ${styles.extraButton} ${
            extraMode === "NO_BALL" ? styles.extraActive : ""
          }`}
          disabled={!canScore}
          onClick={() => toggleExtra("NO_BALL")}
        >
          Nb
        </button>
        <button
          type="button"
          className={`${styles.keyButton} ${
            canScore ? styles.wicketButton : styles.disabledAction
          }`}
          disabled={!canScore}
          onClick={() => setWicketUI({ ...initialWicketUi, open: true })}
        >
          W
        </button>
        <button
          type="button"
          className={`${styles.keyButton} ${
            historyCount === 0 ? styles.disabledAction : styles.undoButton
          }`}
          disabled={historyCount === 0}
          onClick={() => undoLast({ match, setMatch, setExtraMode })}
        >
          ↺
        </button>
        <button
          type="button"
          className={`${styles.keyButton} ${styles.specialButton}`}
          disabled={!live.striker || !live.nonStriker}
          onClick={() => switchStrike({ match, setMatch, extraMode })}
        >
          ⇄
        </button>
        <button
          type="button"
          className={`${styles.keyButton} ${styles.specialButton}`}
          disabled={!live.striker}
          onClick={() => retireBatsman(live.striker, match, setMatch)}
        >
          Ret
        </button>
      </section>

      {isTestMatch(match) && (
        <TestMatchControls match={match} setMatch={setMatch} />
      )}

      <BottomSheetSelector
        open={sheet === "striker"}
        title="Select striker"
        items={eligibleBatsmen}
        onSelect={(player) => choosePlayer("striker", player)}
        onClose={() => setSheet(null)}
      />
      <BottomSheetSelector
        open={sheet === "nonStriker"}
        title="Select non-striker"
        items={eligibleBatsmen}
        onSelect={(player) => choosePlayer("nonStriker", player)}
        onClose={() => setSheet(null)}
      />
      <BottomSheetSelector
        open={sheet === "bowler"}
        title="Select bowler"
        items={bowlingPlayers}
        disabledItems={[
          live.lastOverBowler,
          live.striker,
          live.nonStriker,
        ].filter(Boolean)}
        onSelect={(player) => choosePlayer("bowler", player)}
        onClose={() => setSheet(null)}
      />
      <BottomSheetSelector
        open={sheet === "changeBowler"}
        title="Change bowler"
        items={bowlingPlayers}
        disabledItems={[
          live.bowler,
          live.striker,
          live.nonStriker,
        ].filter(Boolean)}
        onSelect={chooseReplacementBowler}
        onClose={() => setSheet(null)}
      />
      <WicketSheet
        open={wicketUI.open}
        wicketUI={wicketUI}
        setWicketUI={setWicketUI}
        live={live}
        bowlingPlayers={bowlingPlayers}
        match={match}
        setMatch={setMatch}
        extraMode={extraMode}
        setExtraMode={setExtraMode}
      />
    </>
  );
}
