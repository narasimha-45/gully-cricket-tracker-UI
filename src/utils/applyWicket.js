import { deepCopy } from "./helpers";
import { takeSnapshot } from "./snapShot";
import { handleOverEnd } from "./matchEvents";
import { saveMatch } from "../storage/matchDB";
import { evaluateMatchState } from "./matchStateHandlers";

const BOWLER_WICKETS = new Set([
  "BOWLED",
  "CAUGHT",
  "LBW",
  "STUMPED",
  "HIT_WICKET",
  "SPECIAL",
]);

const ensureBattingStats = (innings, player) => {
  innings.battingStats[player] ||= {
    battingPosition: Object.keys(innings.battingStats).length + 1,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    dismissal: null,
  };
};

const ensureBowlingStats = (innings, player) => {
  innings.bowlingStats[player] ||= {
    balls: 0,
    runs: 0,
    wickets: 0,
    maidens: 0,
  };
};

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
  if (!outBatsman || !match.live?.bowler || !match.live?.striker) return;

  const updated = deepCopy(match);
  const live = updated.live;
  const innings = updated.innings[live.inningsIndex];

  takeSnapshot(updated, "WICKET", extraMode);

  innings.thisOver ||= [];
  innings.ballByBall ||= [];
  innings.dismissals ||= {};
  innings.extras ||= { wides: 0, noBalls: 0 };

  const isWide = extraMode === "WIDE";
  const isNoBall = extraMode === "NO_BALL";
  const isLegal = !isWide && !isNoBall;
  const automaticExtra =
    (isWide && match.rules?.wide?.extraRun) ||
    (isNoBall && match.rules?.noBall?.extraRun)
      ? 1
      : 0;
  const totalRuns = Number(runs || 0) + automaticExtra;

  ensureBattingStats(innings, live.striker);
  ensureBattingStats(innings, outBatsman);
  ensureBowlingStats(innings, live.bowler);

  innings.wickets += 1;
  if (!live.outBatsmen.includes(outBatsman)) {
    live.outBatsmen.push(outBatsman);
  }

  const deliveryType = isWide ? "WIDE" : isNoBall ? "NO_BALL" : "WICKET";

  innings.thisOver.push({
    type: deliveryType,
    isWicket: true,
    wicketType,
    outBatsman,
    helper,
    extra: extraMode,
    runs: totalRuns,
    bowler: live.bowler,
  });

  innings.ballByBall.push({
    over: Math.floor(innings.balls / 6),
    ballInOver: isLegal ? (innings.balls % 6) + 1 : innings.balls % 6,
    actualBallNum: isLegal ? innings.balls + 1 : innings.balls,
    striker: live.striker,
    nonStriker: live.nonStriker,
    bowler: live.bowler,
    runs: totalRuns,
    battingRuns: Number(runs || 0),
    type: deliveryType,
    extra: extraMode,
    wicket: {
      type: wicketType,
      outBatsman,
      helper,
    },
    isWicket: true,
    timestamp: Date.now(),
  });

  innings.totalRuns += totalRuns;
  innings.bowlingStats[live.bowler].runs += totalRuns;

  // Completed runs on a run-out belong to the striker. The automatic
  // wide/no-ball penalty is an extra and is not credited to the batter.
  if (!isWide) {
    innings.battingStats[live.striker].runs += Number(runs || 0);
  }
  if (isLegal) {
    innings.battingStats[live.striker].balls += 1;
  }

  if (isWide) innings.extras.wides += totalRuns;
  if (isNoBall) innings.extras.noBalls += automaticExtra;

  const bowlerGetsWicket = BOWLER_WICKETS.has(wicketType) && !isNoBall;
  if (bowlerGetsWicket) innings.bowlingStats[live.bowler].wickets += 1;

  const dismissal = {
    type: wicketType,
    bowler: live.bowler,
    fielder: helper || null,
  };
  innings.battingStats[outBatsman].dismissal = dismissal;
  innings.dismissals[outBatsman] = dismissal;

  if (isLegal) {
    innings.balls += 1;
    innings.bowlingStats[live.bowler].balls += 1;
  }

  // Batters cross after an odd number of completed runs. Remove the
  // dismissed batter only after applying that end change.
  if (Number(runs || 0) % 2 === 1) {
    [live.striker, live.nonStriker] = [live.nonStriker, live.striker];
  }

  if (live.striker === outBatsman) live.striker = null;
  if (live.nonStriker === outBatsman) live.nonStriker = null;

  setExtraMode("NORMAL");

  const matchResolved = evaluateMatchState(updated, setMatch);
  if (!matchResolved && updated.status !== "COMPLETED") {
    if (isLegal && innings.balls > 0 && innings.balls % 6 === 0) {
      handleOverEnd(updated, live, innings);
    }
  }

  updated.updatedAt = Date.now();
  saveMatch(updated).catch(() => undefined);
  setMatch(updated);
};
