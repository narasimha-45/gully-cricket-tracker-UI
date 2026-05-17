import { saveMatch } from "../storage/matchDB";
import { deepCopy } from "./helpers";
import { evaluateMatchState } from "./matchStateHandlers";
import { takeSnapshot } from "./snapShot";

export const retireBatsman = (name, match, setMatch) => {
  if (!name || match.status === "COMPLETED") return;

  takeSnapshot(match, "RETIRED");

  const updated = deepCopy(match);
  const live = updated.live;
  const innings = updated.innings[live.inningsIndex];

  innings.ballByBall ||= [];

  // Store retirement event so partnerships can reset
  innings.ballByBall.push({
    type: "RETIRE",

    striker: live.striker,
    nonStriker: live.nonStriker,

    retired: name,

    over: Math.floor(innings.balls / 6),
    ballInOver: innings.balls % 6,
    actualBallNum: innings.balls,

    timestamp: Date.now(),
  });

  // Remove batter from crease
  if (live.striker === name) {
    live.striker = null;
  }

  if (live.nonStriker === name) {
    live.nonStriker = null;
  }

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
    // Maiden check
    let isMaiden = true;
    for (const ball of innings.thisOver) {
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
    if (isMaiden) innings.bowlingStats[live.bowler].maidens += 1;

    live.lastOverBowler = live.bowler;
    live.bowler = null;
    [live.striker, live.nonStriker] = [live.nonStriker, live.striker];
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

  // ── Snapshot for undo ──────────────────────────────────────
  takeSnapshot(updated, type, extraMode);

  innings.thisOver ||= [];
  innings.ballByBall ||= [];

  // ── Legal ball flag ────────────────────────────────────────
  // Only RUN counts toward the over total and bowler ball count.
  // WIDE and NO_BALL do NOT advance the over.
  const isLegal = type === "RUN";
  const isWide = type === "WIDE";
  const isNoBall = type === "NO_BALL";

  // ── This over ─────────────────────────────────────────────
  innings.thisOver.push({ type, runs });

  // ── Ball-by-ball record ────────────────────────────────────
  innings.ballByBall.push({
    over: Math.floor(innings.balls / 6),
    ballInOver: isLegal ? (innings.balls % 6) + 1 : innings.balls % 6,
    actualBallNum: isLegal ? innings.balls + 1 : innings.balls,
    striker: live.striker,
    nonStriker: live.nonStriker,
    bowler: live.bowler,
    runs,
    type,
    isWicket: false,
    timestamp: Date.now(),
  });

  // ── Runs ───────────────────────────────────────────────────
  if (runs > 0) {
    innings.totalRuns += runs;

    // Batter runs: everything except wides (batter didn't hit it)
    if (!isWide) {
      innings.battingStats[live.striker] ||= {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
      };

      const bat = innings.battingStats[live.striker];

      const extraRun = isNoBall && match.rules?.noBall?.extraRun ? 1 : 0;

      const battingRuns = runs - extraRun;

      bat.runs += battingRuns;

      if (battingRuns === 4) bat.fours += 1;
      if (battingRuns === 6) bat.sixes += 1;
    }

    innings.bowlingStats[live.bowler] ||= {
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    };
    innings.bowlingStats[live.bowler].runs += runs;
  }

  // ── Batter balls faced ─────────────────────────────────────
  // A batter faces a ball on:
  //   - every legal delivery (RUN)
  //   - every no-ball (batter faced it, regardless of extraBall rule)
  // A batter does NOT face a wide (ball not delivered to them).
  if (isLegal || isNoBall) {
    innings.battingStats[live.striker] ||= {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
    };
    innings.battingStats[live.striker].balls += 1;
  }

  // ── Extras ────────────────────────────────────────────────
  if (isWide) {
    innings.extras ||= { wides: 0, noBalls: 0 };
    innings.extras.wides += 1;
  }
  if (isNoBall) {
    innings.extras ||= { wides: 0, noBalls: 0 };
    innings.extras.noBalls += 1;
  }

  // ── Over ball count (legal deliveries only) ────────────────
  if (isLegal) {
    innings.balls++;
    innings.bowlingStats[live.bowler] ||= {
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    };
    innings.bowlingStats[live.bowler].balls++;
  }

  // ── Evaluate match state BEFORE over-end rotation ─────────
  const matchResolved = evaluateMatchState(updated, setMatch);
  if (matchResolved || updated.status === "COMPLETED") {
    updated.updatedAt = Date.now();
    saveMatch(updated);
    setMatch(updated);
    return;
  }

  // ── Over end ───────────────────────────────────────────────
  if (isLegal && innings.balls > 0 && innings.balls % 6 === 0) {
    handleOverEnd(updated, live, innings);
  }

  // ── Strike rotation ────────────────────────────────────────
  // Rotate when an odd number of runs are scored, accounting for
  // whether the extra run from wide/no-ball is included in `runs`.
  const extraRun =
    (isWide && match.rules?.wide?.extraRun) ||
    (isNoBall && match.rules?.noBall?.extraRun)
      ? 1
      : 0;
  const battingRuns = runs - extraRun; // runs actually hit by batter

  const shouldRotate =
    (isLegal && runs % 2 === 1) ||
    (isWide && battingRuns % 2 === 1) ||
    (isNoBall && battingRuns % 2 === 1);

  if (shouldRotate) {
    [live.striker, live.nonStriker] = [live.nonStriker, live.striker];
  }

  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};

export const startSecondInnings = ({ match, setMatch }) => {
  const updated = deepCopy(match);
  takeSnapshot(updated, "START_SECOND_INNINGS");

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
    ballByBall: [],
    extras: { wides: 0, noBalls: 0 },
  };

  updated.live = {
    ...updated.live,
    striker: null,
    nonStriker: null,
    bowler: null,
    lastOverBowler: null,
    outBatsmen: [],
  };

  saveMatch(updated);
  setMatch(updated);
};

export const startSuperOver = ({ match, setMatch }) => {
  const updated = deepCopy(match);
  takeSnapshot(updated, "START_SUPER_OVER");

  const newIndex = updated.innings.length;
  updated.live.inningsIndex = newIndex;
  updated.live.pendingSuperOver = false;

  let battingTeam, bowlingTeam;

  if (newIndex === 2) {
    // First super over: team that batted second bats first
    battingTeam = updated.innings[1].battingTeam;
    bowlingTeam = updated.innings[1].bowlingTeam;
  } else {
    // Subsequent super overs: team that batted second in previous SO bats first
    const prevSOSecond = updated.innings[newIndex - 1];
    battingTeam = prevSOSecond.battingTeam;
    bowlingTeam = prevSOSecond.bowlingTeam;
  }

  updated.innings[newIndex] = {
    battingTeam,
    bowlingTeam,
    totalRuns: 0,
    balls: 0,
    wickets: 0,
    battingStats: {},
    bowlingStats: {},
    thisOver: [],
    ballByBall: [],
    isSuperOver: true,
    extras: { wides: 0, noBalls: 0 },
  };

  updated.live = {
    ...updated.live,
    striker: null,
    nonStriker: null,
    bowler: null,
    lastOverBowler: null,
    outBatsmen: [],
  };

  saveMatch(updated);
  setMatch(updated);
};
