import { saveMatch } from "../storage/matchDB";

import { deepCopy } from "./helpers";
import { evaluateMatchState } from "./matchStateHandlers";
import { takeSnapshot } from "./snapShot";

export const retireBatsman = (name, match, setMatch) => {
  if (!name || match.status === "COMPLETED") return;

  takeSnapshot(match, "RETIRED");

  const updated = deepCopy(match);
  const live = updated.live;
  // remove from crease
  if (live.striker === name) live.striker = null;
  if (live.nonStriker === name) live.nonStriker = null;

  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};

export const pushSelectionHistory = (match, extraMode = "NORMAL") => {
  if (match.status === "COMPLETED") return;

  takeSnapshot(match, "SELECTION", extraMode);

  const innings = match.innings[match.live.inningsIndex];

  if (match.live.striker) {
    innings.battingStats[match.live.striker] ||= {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dismissal: null,
    };
  }

  if (match.live.nonStriker) {
    innings.battingStats[match.live.nonStriker] ||= {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dismissal: null,
    };
  }

  if (match.live.bowler) {
    innings.bowlingStats[match.live.bowler] ||= {
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    };
  }
};

export const handleOverEnd = (updated, live, innings) => {
  if (innings.balls > 0 && innings.balls % 6 === 0) {
    // ---- MAIDEN CHECK ----
    let isMaiden = true;

    for (let ball of innings.thisOver) {
      if (
        (ball.type === "RUN" && ball.runs > 0) ||
        ball.type === "WIDE" ||
        ball.type === "NO_BALL"
      ) {
        isMaiden = false;
        break;
      }
    }

    innings.bowlingStats[live.bowler] ||= {
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    };

    if (isMaiden) {
      innings.bowlingStats[live.bowler].maidens += 1;
    }

    // mark over end
    live.lastOverBowler = live.bowler;
    live.bowler = null;

    // rotate strike
    [live.striker, live.nonStriker] = [live.nonStriker, live.striker];

    // reset over
    innings.thisOver = [];
  }
};

export const applyRun = ({
  runs,
  match,
  setMatch,
  extraMode,
  setExtraMode,
}) => {
  if (match.status === "COMPLETED") return;
  if (extraMode === "NORMAL") {
    recordBall({ type: "RUN", runs, match, setMatch, extraMode });
    return;
  }

  if (extraMode === "WIDE") {
    const extraRun = match.rules?.wide?.extraRun ? 1 : 0;
    recordBall({ type: "WIDE", runs: runs + extraRun, match, setMatch });
    setExtraMode("NORMAL");
    return;
  }

  if (extraMode === "NO_BALL") {
    const extraRun = match.rules?.noBall?.extraRun ? 1 : 0;
    recordBall({ type: "NO_BALL", runs: runs + extraRun, match, setMatch });
    setExtraMode("NORMAL");
    return;
  }
};

export const recordBall = ({ type, runs = 0, match, setMatch, extraMode }) => {
  if (match.status === "COMPLETED") return;
  const updated = deepCopy(match);
  const live = updated.live;
  const innings = updated.innings[live.inningsIndex];

  if (!live.striker || !live.nonStriker || !live.bowler) return;

  // --- history (undo-safe) ---
  takeSnapshot(updated, type, extraMode);

  // ensure thisOver
  innings.thisOver ||= [];

  // ---------------- THIS OVER ----------------
  innings.thisOver.push({ type, runs });

  // ---------------- RUNS ----------------
  if (runs > 0) {
    innings.totalRuns += runs;

    // batsman runs only if NORMAL or NO_BALL
    if (type !== "WIDE") {
      innings.battingStats[live.striker] ||= {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
      };
      const bat = innings.battingStats[live.striker];
      bat.runs += runs;
      if (runs === 4) bat.fours += 1;
      if (runs === 6) bat.sixes += 1;
    }

    // bowler runs
    innings.bowlingStats[live.bowler] ||= {
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    };
    innings.bowlingStats[live.bowler].runs += runs;
  }

  // ---------------- BALL COUNT ----------------

  // Batsman balls: only for RUN and NO_BALL if extraBall
  if (
    type === "RUN" ||
    (type === "NO_BALL" && match.rules?.noBall?.extraBall)
  ) {
    innings.battingStats[live.striker] ||= {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
    };
    innings.battingStats[live.striker].balls += 1;
  }

  // ---------------- BALL COUNT (SINGLE SOURCE OF TRUTH) ----------------
  const countsBall = type === "RUN";

  if (type === "WIDE") {
    innings.extras ||= { wides: 0, noBalls: 0 };
    innings.extras.wides += 1;
  }

  if (type === "NO_BALL") {
    innings.extras ||= { wides: 0, noBalls: 0 };
    innings.extras.noBalls += 1;
  }
  if (countsBall) {
    innings.balls++;

    innings.bowlingStats[live.bowler] ||= {
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    };
    innings.bowlingStats[live.bowler].balls++;

    evaluateMatchState(updated,setMatch);

    handleOverEnd(updated, live, innings);
  }

  // ---------------- STRIKE ROTATION ----------------
  if (
    (runs % 2 === 1 && type === "RUN") ||
    (type === "WIDE" && runs % 2 == 0 && match.rules?.wide?.extraRun) ||
    (type === "NO_BALL" && runs % 2 == 0 && match.rules?.noBall?.extraRun) ||
    (type === "WIDE" && runs % 2 == 1 && !match.rules?.wide?.extraRun) ||
    (type === "NO_BALL" && runs % 2 == 1 && !match.rules?.noBall?.extraRun)
  ) {
    [live.striker, live.nonStriker] = [live.nonStriker, live.striker];
  }

  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};

export const startSecondInnings = ({ match, setMatch }) => {
  const updated = deepCopy(match);

  updated.live.inningsIndex = 1;
  updated.live.pendingNextInnings = false;

  updated.innings[1] = {
    battingTeam: match.innings[0].bowlingTeam,
    bowlingTeam: match.innings[0].battingTeam,
    totalRuns: 0,
    balls: 0,
    wickets: 0,
    battingStats: {},
    bowlingStats: {},
    thisOver: [],
    extras: {
      wides: 0,
      noBalls: 0,
    },
  };

  updated.live = {
    ...updated.live,
    striker: null,
    nonStriker: null,
    bowler: null,
    lastOverBowler: null,
    outBatsmen: [],
    history: [],
  };

  saveMatch(updated);
  setMatch(updated);
};
