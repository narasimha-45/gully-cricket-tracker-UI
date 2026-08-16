import { useMemo, useState } from "react";
import BottomSheetSelector from "./BottomSheetSelector";
import TestMatchControls from "./TestMatchControls";
import WicketSheet from "./WicketSheet";
import { formatName } from "../utils/helpers";
import { getPlayersForTeam, isTestMatch, sameName } from "../utils/matchModel";
import {
  selectBowlingPlayers,
  selectCanScore,
  selectCurrentInnings,
  selectEligibleBatters,
} from "../features/match/state/matchSelectors";
import { getBallPresentation } from "../utils/matchPresentation";
import { getCurrentPartnership } from "../utils/partnerships";
import { renderBatStats, renderBowlStats } from "../utils/renderStats";
import { MATCH_ACTIONS } from "../features/match/state/matchActions";
import { useMatchSession } from "../features/match/state/useMatchSession";
import styles from "./LiveScoringPanel.module.css";

const initialWicketUi = {
  open: false,
  type: null,
  helper: null,
  runOut: { outBatsman: null, runs: 0 },
};

export default function LiveScoringPanel() {
  const { match, dispatch, extraMode } = useMatchSession();
  const [sheet, setSheet] = useState(null);
  const [wicketUI, setWicketUI] = useState(initialWicketUi);

  const innings = useMemo(() => selectCurrentInnings(match), [match]);
  const live = match.live;
  const bowlingPlayers = useMemo(() => selectBowlingPlayers(match), [match]);
  const eligibleBatsmen = useMemo(() => selectEligibleBatters(match), [match]);

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

  const canScore = selectCanScore(match);
  const historyCount = live.history?.length || 0;
  const partnership = getCurrentPartnership(innings);

  const choosePlayer = (role, player) => {
    dispatch({ type: MATCH_ACTIONS.SELECT_PLAYER, payload: { role, player } });
    setSheet(null);
  };

  const chooseReplacementBowler = (player) => {
    dispatch({ type: MATCH_ACTIONS.CHANGE_BOWLER, payload: { player } });
    setSheet(null);
  };

  const toggleExtra = (mode) => {
    if (!canScore) return;
    dispatch({ type: MATCH_ACTIONS.TOGGLE_EXTRA_MODE, payload: mode });
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

      <section className={styles.card} aria-label="Current batters">
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
        <section
          className={styles.partnershipCard}
          aria-label="Current partnership"
        >
          <span className={styles.partnershipLabel}>Partnership</span>
          <div className={styles.partnershipMain}>
            <span className={styles.partnershipRuns}>
              {partnership?.runs ?? 0}
              <span
                className={styles.partnershipBalls}
              >{` (${partnership?.balls ?? 0})`}</span>
            </span>
            <div className={styles.partnershipBatters}>
              {partnership
                ? Object.entries(partnership.contributions).map(
                    ([name, contribution]) => (
                      <span key={name} className={styles.partnershipBatter}>
                        {formatName(name)}: {contribution.runs} (
                        {contribution.balls})
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

      <section className={styles.card} aria-label="Current bowler">
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
            className={
              !live.bowler ? styles.selectablePlayer : styles.playerName
            }
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

      <section className={styles.overBox} aria-label="Current over">
        <p className={styles.overLabel}>This over</p>
        <div className={styles.overBalls}>
          {(innings.thisOver || []).length === 0 && (
            <span className={styles.emptyOver}>No balls yet</span>
          )}
          {(innings.thisOver || []).map((ball, index) => {
            const presentation = getBallPresentation(ball, match);
            const isLatest = index === (innings.thisOver || []).length - 1;
            return (
              <span
                // "This over" is cleared at the end of every over, so the
                // index alone is a stable key for its lifetime — unlike the
                // previous `${innings.balls}-${index}` key, which changed on
                // every delivery and force-remounted every chip already on
                // screen, not just the new one.
                key={index}
                className={`${styles.ballChip} ${styles[presentation.kind]} ${isLatest ? styles.ballChipEnter : ""}`}
              >
                {presentation.label}
              </span>
            );
          })}
        </div>
      </section>

      <section
        className={`${styles.keypad} ${!canScore ? styles.keypadDisabled : ""}`}
        aria-label="Scoring keypad"
      >
        {[1, 2, 3, 4, 6, 0].map((run) => (
          <button
            key={run}
            type="button"
            className={styles.keyButton}
            disabled={!canScore}
            onClick={() =>
              dispatch({
                type: MATCH_ACTIONS.SCORE_RUN,
                payload: { runs: run },
              })
            }
          >
            {run}
          </button>
        ))}

        <button
          type="button"
          className={`${styles.keyButton} ${styles.extraButton} ${extraMode === "WIDE" ? styles.extraActive : ""}`}
          disabled={!canScore}
          onClick={() => toggleExtra("WIDE")}
          aria-pressed={extraMode === "WIDE"}
        >
          Wd
        </button>
        <button
          type="button"
          className={`${styles.keyButton} ${styles.extraButton} ${extraMode === "NO_BALL" ? styles.extraActive : ""}`}
          disabled={!canScore}
          onClick={() => toggleExtra("NO_BALL")}
          aria-pressed={extraMode === "NO_BALL"}
        >
          Nb
        </button>
        <button
          type="button"
          className={`${styles.keyButton} ${canScore ? styles.wicketButton : styles.disabledAction}`}
          disabled={!canScore}
          onClick={() => setWicketUI({ ...initialWicketUi, open: true })}
        >
          W
        </button>
        <button
          type="button"
          className={`${styles.keyButton} ${historyCount === 0 ? styles.disabledAction : styles.undoButton}`}
          disabled={
            historyCount === 0 ||
            live.pendingNextInnings ||
            live.pendingSuperOver
          }
          onClick={() => dispatch({ type: MATCH_ACTIONS.UNDO })}
          aria-label="Undo last scoring action"
        >
          ↺
        </button>
        <button
          type="button"
          className={`${styles.keyButton} ${styles.specialButton}`}
          disabled={!live.striker || !live.nonStriker}
          onClick={() => dispatch({ type: MATCH_ACTIONS.SWITCH_STRIKE })}
          aria-label="Switch strike"
        >
          ⇄
        </button>
        <button
          type="button"
          className={`${styles.keyButton} ${styles.specialButton}`}
          disabled={!live.striker}
          onClick={() =>
            dispatch({
              type: MATCH_ACTIONS.RETIRE_BATTER,
              payload: { player: live.striker },
            })
          }
        >
          Ret
        </button>
      </section>

      {isTestMatch(match) && <TestMatchControls />}

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
        disabledItems={[live.bowler, live.striker, live.nonStriker].filter(
          Boolean,
        )}
        onSelect={chooseReplacementBowler}
        onClose={() => setSheet(null)}
      />
      <WicketSheet
        open={wicketUI.open}
        wicketUI={wicketUI}
        setWicketUI={setWicketUI}
      />
    </>
  );
}
