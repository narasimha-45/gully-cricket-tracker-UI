import { deepCopy } from "../../../utils/helpers";
import { stamp } from "./matchPrimitives";

const restoreFromSnapshot = (match, previous) => {
  const targetIndex = previous.inningsIndex ?? match.live.inningsIndex;
  match.live.inningsIndex = targetIndex;
  const innings = match.innings[targetIndex];

  match.live.striker = previous.striker ?? null;
  match.live.nonStriker = previous.nonStriker ?? null;
  match.live.bowler = previous.bowler ?? null;
  match.live.lastOverBowler = previous.lastOverBowler ?? null;
  match.live.outBatsmen = [...(previous.outBatsmen || [])];
  match.live.pendingNextInnings = Boolean(previous.pendingNextInnings);
  match.live.pendingNextInningsIndex = previous.pendingNextInningsIndex ?? null;
  match.live.pendingSuperOver = Boolean(previous.pendingSuperOver);
  if (Object.prototype.hasOwnProperty.call(previous, "testConfig")) {
    match.testConfig = deepCopy(previous.testConfig);
  }

  innings.balls = previous.balls;
  innings.totalRuns = previous.totalRuns;
  innings.wickets = previous.wickets;
  innings.completed = Boolean(previous.completed);
  innings.completionReason = previous.completionReason ?? null;
  innings.battingStats = deepCopy(previous.battingStats || {});
  innings.bowlingStats = deepCopy(previous.bowlingStats || {});
  innings.dismissals = deepCopy(previous.dismissals || {});
  innings.thisOver = deepCopy(previous.thisOver || []);
  innings.thisOverBowlerChanged = Boolean(previous.thisOverBowlerChanged);
  innings.ballByBall = Array.isArray(previous.ballByBall)
    ? deepCopy(previous.ballByBall)
    : (innings.ballByBall || []).slice(
        0,
        Number(previous.ballByBallLength ?? 0),
      );
  innings.extras = deepCopy(previous.extras || { wides: 0, noBalls: 0 });
  return previous.extraMode || "NORMAL";
};

export const undo = (match, { allowCompleted = false } = {}) => {
  if (!match?.live?.history?.length) return { match, extraMode: "NORMAL" };
  if (!allowCompleted && match.status === "COMPLETED") {
    return { match, extraMode: "NORMAL" };
  }

  const updated = deepCopy(match);
  const last = updated.live.history.pop();
  if (!last?.prevState) return { match, extraMode: "NORMAL" };

  const targetIndex = last.prevState.inningsIndex ?? updated.live.inningsIndex;
  if (targetIndex < updated.innings.length - 1) {
    updated.innings = updated.innings.slice(0, targetIndex + 1);
    updated.live.inningsIndex = targetIndex;
  }

  updated.result = null;
  updated.status = "LIVE";
  updated.ui = { ...(updated.ui || {}), matchResultSeen: false };
  const extraMode = restoreFromSnapshot(updated, last.prevState);
  return { match: stamp(updated), extraMode };
};
