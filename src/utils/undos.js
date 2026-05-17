import { deepCopy } from "./helpers";
import { takeSnapshot } from "./snapShot";
import { saveMatch } from "../storage/matchDB";
import { isInningsComplete } from "./matchStateHandlers";

/* ─────────────────────────────────────────────────────────────
   Helper: trim innings array to only what's valid for a given
   inningsIndex, and clear any stale result / pending flags.
   Call this any time an undo moves inningsIndex backward.
───────────────────────────────────────────────────────────── */
const trimToInningsIndex = (updated, targetIndex) => {
  // Keep only innings 0..targetIndex
  updated.innings = updated.innings.slice(0, targetIndex + 1);
  updated.live.inningsIndex = targetIndex;

  // Clear result — it belongs to a state we're undoing past
  updated.result = null;
  updated.status = "LIVE";

  // Clear all transition flags
  updated.live.pendingNextInnings = false;
  updated.live.pendingSuperOver   = false;
};

const clearResolvedState = (updated) => {
  updated.result = null;
  updated.status = "LIVE";

  updated.live.pendingNextInnings = false;
  updated.live.pendingSuperOver = false;
};

/* ─────────────────────────────────────────────────────────────
   Restore live + innings state from a history snapshot entry.
───────────────────────────────────────────────────────────── */
const restoreFromSnapshot = (updated, p, setExtraMode) => {
  const innings = updated.innings[updated.live.inningsIndex];

  // Live
  updated.live.striker        = p.striker        ?? null;
  updated.live.nonStriker     = p.nonStriker      ?? null;
  updated.live.bowler         = p.bowler          ?? null;
  updated.live.lastOverBowler = p.lastOverBowler  ?? null;
  updated.live.outBatsmen     = [...(p.outBatsmen || [])];

  // Innings
  innings.balls        = p.balls;
  innings.totalRuns    = p.totalRuns;
  innings.wickets      = p.wickets;
  innings.battingStats = deepCopy(p.battingStats  || {});
  innings.bowlingStats = deepCopy(p.bowlingStats  || {});
  innings.thisOver     = deepCopy(p.thisOver      || []);
  innings.ballByBall   = deepCopy(p.ballByBall    || []);
  innings.extras       = deepCopy(p.extras        || { wides: 0, noBalls: 0 });

  // Extra mode UI
  setExtraMode(p.extraMode || "NORMAL");
};

/* ═══════════════════════════════════════════════════════════
   undoLast  — called from the keypad undo button
═══════════════════════════════════════════════════════════ */
export const undoLast = ({ match, setMatch, setExtraMode }) => {
  if (match.status === "COMPLETED")    return;
  if (match.live.pendingNextInnings)   return;
  if (!match?.live?.history?.length)   return;

  const updated = deepCopy(match);
  const last    = updated.live.history.pop();
  if (!last) return;

  const p             = last.prevState;
  const targetIndex   = p.inningsIndex ?? updated.live.inningsIndex;

  // If this undo crosses an innings boundary (e.g. undoing
  // START_SUPER_OVER or START_SECOND_INNINGS), trim everything
  // beyond the restored index.
  if (targetIndex < updated.innings.length - 1) {
    trimToInningsIndex(updated, targetIndex);
  } else {
    updated.live.inningsIndex = targetIndex;
  }

  restoreFromSnapshot(updated, p, setExtraMode);

  clearResolvedState(updated);

  // Re-open innings-end popup if we land back on a completed innings
  if (last.type === "START_SUPER_OVER") {
    // We undid the super over start — show the tie popup again
    updated.live.pendingSuperOver = true;
    // result was already cleared by trimToInningsIndex
  }

  if (last.type === "START_SECOND_INNINGS") {
    // We undid the second innings start — show innings-end popup again
    const battingPlayers =
      updated.innings[0].battingTeam === updated.teams.teamA.name
        ? updated.teams.teamA.players
        : updated.teams.teamB.players;

    if (isInningsComplete(updated.innings[0], battingPlayers, updated.totalOvers)) {
      updated.live.pendingNextInnings = true;
    }
  }

  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};

/* ═══════════════════════════════════════════════════════════
   undoFromInningsPopup  — "Undo Last Ball" inside the
   "Innings Complete" or "Match Tied" popup
═══════════════════════════════════════════════════════════ */
export const undoFromInningsPopup = ({ match, setMatch, setExtraMode }) => {
  const updated = deepCopy(match);

  // Dismiss popup immediately
  updated.live.pendingNextInnings = false;
  updated.live.pendingSuperOver   = false;

  const last = updated.live.history.pop();
  if (!last) {
    updated.updatedAt = Date.now();
    saveMatch(updated);
    setMatch(updated);
    return;
  }

  const p           = last.prevState;
  const targetIndex = p.inningsIndex ?? updated.live.inningsIndex;

  // Trim if crossing innings boundary
  if (targetIndex < updated.innings.length - 1) {
    trimToInningsIndex(updated, targetIndex);
  } else {
    updated.live.inningsIndex = targetIndex;
  }

  restoreFromSnapshot(updated, p, setExtraMode);
  clearResolvedState(updated);

  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};

/* ═══════════════════════════════════════════════════════════
   undoFromMatchPopup  — "Undo Last Ball" inside the
   match result popup (match was COMPLETED)
═══════════════════════════════════════════════════════════ */
export const undoFromMatchPopup = (match, setMatch, setExtraMode) => {
  const updated = deepCopy(match);

  // Re-open the match
  updated.status = "LIVE";
  updated.result = null;
  updated.ui     = { ...(updated.ui || {}), matchResultSeen: false };
  updated.live.pendingNextInnings = false;
  updated.live.pendingSuperOver   = false;

  const last = updated.live.history.pop();
  if (!last) {
    updated.updatedAt = Date.now();
    saveMatch(updated);
    setMatch(updated);
    return;
  }

  const p           = last.prevState;
  const targetIndex = p.inningsIndex ?? updated.live.inningsIndex;

  // Trim if crossing innings boundary (e.g. undo across super over end)
  if (targetIndex < updated.innings.length - 1) {
    trimToInningsIndex(updated, targetIndex);
    // trimToInningsIndex already sets status/result/flags —
    // but we still need ui.matchResultSeen cleared
    updated.status = "LIVE";
    updated.result = null;
  } else {
    updated.live.inningsIndex = targetIndex;
  }

  restoreFromSnapshot(updated, p, setExtraMode);

  clearResolvedState(updated);

  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};