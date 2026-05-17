import { deepCopy } from "./helpers";

export const takeSnapshot = (match, type, extraMode = "NORMAL") => {
  const live = match.live;
  const innings = match.innings[match.live.inningsIndex];

  live.history ||= [];

  live.history.push({
    type,
    prevState: {
      // -------- LIVE --------
      striker: live.striker,
      nonStriker: live.nonStriker,
      bowler: live.bowler,
      lastOverBowler: live.lastOverBowler,

      inningsIndex: live.inningsIndex,

      outBatsmen: [...live.outBatsmen],

      // -------- INNINGS --------
      balls: innings.balls,
      totalRuns: innings.totalRuns,
      wickets: innings.wickets,

      battingStats: deepCopy(innings.battingStats),
      bowlingStats: deepCopy(innings.bowlingStats),

      thisOver: deepCopy(innings.thisOver || []),
      ballByBall: deepCopy(innings.ballByBall || []),

      extras: deepCopy(
        innings.extras || {
          wides: 0,
          noBalls: 0,
        },
      ),

      // -------- UI --------
      extraMode,
    },
  });
};
