import { deepCopy } from "./helpers";
import { saveMatch } from "../storage/matchDB";

const trimToInningsIndex = (updated, targetIndex) => {
  updated.innings = updated.innings.slice(0, targetIndex + 1);
  updated.live.inningsIndex = targetIndex;
};

const restoreFromSnapshot = (updated, previous, setExtraMode) => {
  const targetIndex = previous.inningsIndex ?? updated.live.inningsIndex;
  updated.live.inningsIndex = targetIndex;
  const innings = updated.innings[targetIndex];

  updated.live.striker = previous.striker ?? null;
  updated.live.nonStriker = previous.nonStriker ?? null;
  updated.live.bowler = previous.bowler ?? null;
  updated.live.lastOverBowler = previous.lastOverBowler ?? null;
  updated.live.outBatsmen = [...(previous.outBatsmen || [])];
  updated.live.pendingNextInnings = Boolean(previous.pendingNextInnings);
  updated.live.pendingNextInningsIndex =
    previous.pendingNextInningsIndex ?? null;
  updated.live.pendingSuperOver = Boolean(previous.pendingSuperOver);
  if (Object.prototype.hasOwnProperty.call(previous, "testConfig")) {
    updated.testConfig = deepCopy(previous.testConfig);
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
  innings.ballByBall = deepCopy(previous.ballByBall || []);
  innings.extras = deepCopy(
    previous.extras || { wides: 0, noBalls: 0 },
  );

  setExtraMode(previous.extraMode || "NORMAL");
};

const reopenMatch = (updated) => {
  updated.result = null;
  updated.status = "LIVE";
  updated.ui = {
    ...(updated.ui || {}),
    matchResultSeen: false,
  };
};

const persist = (updated, setMatch) => {
  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};

const restoreLastSnapshot = ({ match, setMatch, setExtraMode }) => {
  if (!match?.live?.history?.length) return false;

  const updated = deepCopy(match);
  const last = updated.live.history.pop();
  if (!last?.prevState) return false;

  const targetIndex =
    last.prevState.inningsIndex ?? updated.live.inningsIndex;

  if (targetIndex < updated.innings.length - 1) {
    trimToInningsIndex(updated, targetIndex);
  }

  reopenMatch(updated);
  restoreFromSnapshot(updated, last.prevState, setExtraMode);
  persist(updated, setMatch);
  return true;
};

export const undoLast = ({ match, setMatch, setExtraMode }) => {
  if (match.status === "COMPLETED") return;
  if (match.live.pendingNextInnings || match.live.pendingSuperOver) return;
  restoreLastSnapshot({ match, setMatch, setExtraMode });
};

export const undoFromInningsPopup = ({ match, setMatch, setExtraMode }) => {
  restoreLastSnapshot({ match, setMatch, setExtraMode });
};

export const undoFromMatchPopup = (match, setMatch, setExtraMode) => {
  restoreLastSnapshot({ match, setMatch, setExtraMode });
};
