import { deepCopy } from "./helpers";
import { takeSnapshot } from "./snapShot";
import { handleOverEnd } from "./matchEvents";
import { saveMatch } from "../storage/matchDB";
import { evaluateMatchState } from "./matchStateHandlers";

export const applyWicket = ({
  wicketType,
  outBatsman,
  helper = null,
  runs = 0,
  match,
  setMatch,
  extraMode,
  setExtraMode,
}) => {
  if (match.status === "COMPLETED") return;
  const updated = deepCopy(match);
  const live = updated.live;
  const innings = updated.innings[live.inningsIndex];

  const isExtra = extraMode === "NO_BALL" || extraMode === "WIDE";

  takeSnapshot(updated, "WICKET", extraMode);

  innings.thisOver ||= [];

  /* ---------- BALL COUNT ---------- */
  const countsBall = extraMode === "NORMAL";

  /* ---------- WICKET ---------- */
  innings.wickets++;
  live.outBatsmen.push(outBatsman);

  innings.thisOver.push({
    type: "WICKET",
    wicketType,
    outBatsman,
    helper,
    extra: extraMode,
    runs: runs,
  });

  // ---------------- BALL BY BALL (FULL HISTORY) ----------------
  innings.ballByBall ||= [];
  innings.ballByBall.push({
    over: Math.floor(innings.balls / 6),
    ballInOver: (innings.balls % 6) + (countsBall ? 1 : 0),
    actualBallNum: innings.balls + (countsBall ? 1 : 0),
    striker: live.striker,
    nonStriker: live.nonStriker,
    bowler: live.bowler,
    runs,
    type: "WICKET",
    wicket: {
      type: wicketType,
      outBatsman,
      helper,
    },
    isWicket: true,
    timestamp: Date.now(),
  });

  innings.battingStats[outBatsman] ||= {
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    dismissal: null,
  };

  innings.totalRuns += runs;

  if (extraMode === "NO_BALL" && match.rules?.noBall?.extraRun) {
    innings.totalRuns += 1;
  }
  if (extraMode === "WIDE" && match.rules?.wide?.extraRun) {
    innings.totalRuns += 1;
  }

  innings.battingStats[live.striker].runs += runs;

  if (extraMode !== "WIDE") {
    innings.battingStats[live.striker].balls += 1;
  }

  innings.battingStats[outBatsman].dismissal = {
    type: wicketType,
    bowler: live.bowler,
    fielder: helper || null,
  };

  /* ---------- BOWLER CREDIT ---------- */
  const bowlerGetsWicket =
    ["BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET", "SPECIAL"].includes(
      wicketType,
    ) && extraMode !== "NO_BALL";

  if (bowlerGetsWicket) {
    innings.bowlingStats[live.bowler] ||= {
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    };
    innings.bowlingStats[live.bowler].wickets++;
    innings.bowlingStats[live.bowler].runs += runs;
    if (extraMode === "NO_BALL" && match.rules?.noBall?.extraRun) {
      innings.bowlingStats[live.bowler].runs += 1;
    }
    if (extraMode === "WIDE" && match.rules?.wide?.extraRun) {
      innings.bowlingStats[live.bowler].runs += 1;
    }
  }

  innings.bowlingStats[live.bowler] ||= {
    balls: 0,
    runs: 0,
    wickets: 0,
    maidens: 0,
  };
  innings.dismissals ||= {};

  innings.dismissals[outBatsman] = {
    type: wicketType,
    bowler: live.bowler,
    fielder: helper || null,
  };

  /* ---------- NEXT BATSMAN ---------- */
  // REMOVE BATSMAN REGARDLESS OF BALL COUNT
  if (outBatsman === live.striker) {
    live.striker = null;
  } else if (outBatsman === live.nonStriker) {
    live.nonStriker = null;
  }

  /* ---------- RESET EXTRA ---------- */
  setExtraMode("NORMAL");

  if (countsBall) {
    innings.balls++;
    innings.bowlingStats[live.bowler].balls++;

    handleOverEnd(updated, live, innings);
    evaluateMatchState(updated,setMatch);
  }

  updated.updatedAt = Date.now();
  saveMatch(updated);
  setMatch(updated);
};
