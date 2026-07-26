import { deepCopy } from "./helpers";

const MAX_UNDO_HISTORY = 30;

export const takeSnapshot = (match, type, extraMode = "NORMAL") => {
  const live = match.live;
  const innings = match.innings[live.inningsIndex];

  live.history ||= [];

  live.history.push({
    type,
    prevState: {
      striker: live.striker,
      nonStriker: live.nonStriker,
      bowler: live.bowler,
      lastOverBowler: live.lastOverBowler,
      inningsIndex: live.inningsIndex,
      outBatsmen: [...(live.outBatsmen || [])],
      pendingNextInnings: Boolean(live.pendingNextInnings),
      pendingNextInningsIndex: live.pendingNextInningsIndex ?? null,
      pendingSuperOver: Boolean(live.pendingSuperOver),
      testConfig: deepCopy(match.testConfig || null),

      balls: innings.balls,
      totalRuns: innings.totalRuns,
      wickets: innings.wickets,
      completed: Boolean(innings.completed),
      completionReason: innings.completionReason ?? null,
      battingStats: deepCopy(innings.battingStats || {}),
      bowlingStats: deepCopy(innings.bowlingStats || {}),
      dismissals: deepCopy(innings.dismissals || {}),
      thisOver: deepCopy(innings.thisOver || []),
      thisOverBowlerChanged: Boolean(innings.thisOverBowlerChanged),
      ballByBall: deepCopy(innings.ballByBall || []),
      extras: deepCopy(innings.extras || { wides: 0, noBalls: 0 }),

      extraMode,
    },
  });

  if (live.history.length > MAX_UNDO_HISTORY) {
    live.history.splice(0, live.history.length - MAX_UNDO_HISTORY);
  }
};
