import { deepCopy } from "./helpers";
import { takeSnapshot } from "./snapShot";
import { handleOverEnd } from "./matchEvents";
import { saveMatch } from "../storage/matchDB";

export const undoFromMatchPopup = (match, setMatch, setExtraMode) => {
  const updated = deepCopy(match);

  /* -------------------------------------------------
     1️⃣ Re-open the match
  --------------------------------------------------*/
  updated.status = "LIVE";
  updated.result = null;

  updated.ui = {
    ...(updated.ui || {}),
    matchResultSeen: false,
  };

  /* -------------------------------------------------
     2️⃣ Ensure innings transition flags are cleared
  --------------------------------------------------*/
  updated.live.pendingNextInnings = false;

  /* -------------------------------------------------
     3️⃣ Undo last history entry
  --------------------------------------------------*/
  const last = updated.live.history.pop();
  if (!last) {
    updated.updatedAt = Date.now();
    saveMatch(updated);
    setMatch(updated);
    return;
  }

  const innings = updated.innings[updated.live.inningsIndex];
  const p = last.prevState;

  /* -------------------------------------------------
     4️⃣ Restore LIVE state
  --------------------------------------------------*/
  updated.live.striker = p.striker ?? null;
  updated.live.nonStriker = p.nonStriker ?? null;
  updated.live.bowler = p.bowler ?? null;
  updated.live.lastOverBowler = p.lastOverBowler ?? null;
  updated.live.outBatsmen = [...(p.outBatsmen || [])];

  /* -------------------------------------------------
     5️⃣ Restore innings state
  --------------------------------------------------*/
  innings.balls = p.balls;
  innings.totalRuns = p.totalRuns;
  innings.wickets = p.wickets;
  innings.battingStats = deepCopy(p.battingStats || {});
  innings.bowlingStats = deepCopy(p.bowlingStats || {});
  innings.thisOver = deepCopy(p.thisOver || []);

  /* -------------------------------------------------
     6️⃣ Restore extra mode
  --------------------------------------------------*/
  setExtraMode(p.extraMode || "NORMAL");

  /* -------------------------------------------------
     7️⃣ Commit
  --------------------------------------------------*/
  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};

export const undoLast = ({ match, setMatch, setExtraMode }) => {
  if (match.status === "COMPLETED") return;
  // console.log("match", match.status);
  if (match.live.pendingNextInnings) return;
  if (!match?.live?.history?.length) return;

  const updated = deepCopy(match);
  const last = updated.live.history.pop();
  if (!last) return;

  const innings = updated.innings[updated.live.inningsIndex];
  const p = last.prevState;

  // -------- RESTORE LIVE STATE --------
  updated.live.striker = p.striker;
  updated.live.nonStriker = p.nonStriker;
  updated.live.bowler = p.bowler;
  updated.live.lastOverBowler = p.lastOverBowler ?? updated.live.lastOverBowler;
  updated.live.outBatsmen = [...(p.outBatsmen || [])];

  // -------- RESTORE INNINGS STATE --------
  innings.balls = p.balls;
  innings.totalRuns = p.totalRuns;
  innings.wickets = p.wickets;
  innings.battingStats = deepCopy(p.battingStats);
  innings.bowlingStats = deepCopy(p.bowlingStats);
  innings.thisOver = deepCopy(p.thisOver || []);

  // -------- RESTORE EXTRA MODE --------
  setExtraMode(p.extraMode || "NORMAL");

  // -------- COMMIT --------
  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};

export const undoFromInningsPopup = ({match,setMatch,setExtraMode}) => {
  const updated = deepCopy(match);

  // 1️⃣ Cancel innings completion
  updated.live.pendingNextInnings = false;

  // 2️⃣ Undo last history entry
  const last = updated.live.history.pop();
  if (!last) {
    saveMatch(updated);
    setMatch(updated);
    return;
  }

  const innings = updated.innings[updated.live.inningsIndex];
  const p = last.prevState;

  // 3️⃣ Restore live state
  updated.live.striker = p.striker;
  updated.live.nonStriker = p.nonStriker;
  updated.live.bowler = p.bowler;
  updated.live.lastOverBowler = p.lastOverBowler ?? null;
  updated.live.outBatsmen = [...(p.outBatsmen || [])];

  // 4️⃣ Restore innings state
  innings.balls = p.balls;
  innings.totalRuns = p.totalRuns;
  innings.wickets = p.wickets;
  innings.battingStats = deepCopy(p.battingStats);
  innings.bowlingStats = deepCopy(p.bowlingStats);
  innings.thisOver = deepCopy(p.thisOver || []);

  // 5️⃣ Restore extra mode
  setExtraMode(p.extraMode || "NORMAL");

  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};
