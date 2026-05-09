import { deepCopy } from "./helpers";

export const takeSnapshot = (match, type, extraMode = "NORMAL") => {
  const live = match.live;
  const innings = match.innings[match.live.inningsIndex];
  live.history ||= [];
  live.history.push({
    type: type,
    prevState: {
      striker: live.striker,
      nonStriker: live.nonStriker,
      bowler: live.bowler,
      lastOverBowler: live.lastOverBowler,
      balls: innings.balls,
      totalRuns: innings.totalRuns,
      wickets: innings.wickets,
      outBatsmen: [...live.outBatsmen],
      battingStats: deepCopy(innings.battingStats),
      bowlingStats: deepCopy(innings.bowlingStats),
      thisOver: deepCopy(innings.thisOver || []),
      extraMode,
    },
  });
};
