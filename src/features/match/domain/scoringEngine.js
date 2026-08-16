import { deepCopy } from "../../../utils/helpers";
import { takeSnapshot } from "../../../utils/snapShot";
import { sameName } from "../../../utils/matchModel";
import {
  BOWLER_WICKETS,
  ensureBatter,
  ensureBowler,
  handleOverEnd,
  isLegalDelivery,
  stamp,
} from "./matchPrimitives";
import { evaluateMatchState } from "./matchResolution";

const deliveryTypeFor = (extraMode) =>
  extraMode === "WIDE" ? "WIDE" : extraMode === "NO_BALL" ? "NO_BALL" : "RUN";

const automaticExtraFor = (match, type) =>
  ((type === "WIDE" && match.rules?.wide?.extraRun) ||
    (type === "NO_BALL" && match.rules?.noBall?.extraRun))
    ? 1
    : 0;

export const scoreRun = (match, { runs, extraMode = "NORMAL" }) => {
  if (match.status === "COMPLETED") return match;
  if (!match.live?.striker || !match.live?.nonStriker || !match.live?.bowler) {
    return match;
  }

  const type = deliveryTypeFor(extraMode);
  const updated = deepCopy(match);
  const live = updated.live;
  const innings = updated.innings[live.inningsIndex];
  takeSnapshot(updated, type, extraMode);

  innings.thisOver ||= [];
  innings.ballByBall ||= [];
  innings.extras ||= { wides: 0, noBalls: 0 };

  const isWide = type === "WIDE";
  const isNoBall = type === "NO_BALL";
  const legal = isLegalDelivery(updated, type);
  const automaticExtra = automaticExtraFor(updated, type);
  const selectedRuns = Math.max(0, Number(runs || 0));
  const totalRuns = selectedRuns + automaticExtra;
  const battingRuns = isWide ? 0 : selectedRuns;

  ensureBatter(innings, live.striker);
  ensureBowler(innings, live.bowler);

  innings.thisOver.push({ type, runs: totalRuns, bowler: live.bowler });
  innings.ballByBall.push({
    over: Math.floor(innings.balls / 6),
    ballInOver: legal ? (innings.balls % 6) + 1 : innings.balls % 6,
    actualBallNum: legal ? innings.balls + 1 : innings.balls,
    striker: live.striker,
    nonStriker: live.nonStriker,
    bowler: live.bowler,
    runs: totalRuns,
    battingRuns,
    type,
    isWicket: false,
    timestamp: Date.now(),
  });

  innings.totalRuns += totalRuns;
  innings.bowlingStats[live.bowler].runs += totalRuns;

  if (!isWide) {
    const batter = innings.battingStats[live.striker];
    batter.runs += battingRuns;
    if (battingRuns === 4) batter.fours += 1;
    if (battingRuns === 6) batter.sixes += 1;
  }

  if (legal) {
    innings.battingStats[live.striker].balls += 1;
    innings.balls += 1;
    innings.bowlingStats[live.bowler].balls += 1;
  }

  if (isWide) innings.extras.wides += totalRuns;
  if (isNoBall) innings.extras.noBalls += automaticExtra;

  const resolved = evaluateMatchState(updated);
  if (!resolved && updated.status !== "COMPLETED") {
    if (selectedRuns % 2 === 1) {
      [live.striker, live.nonStriker] = [live.nonStriker, live.striker];
    }
    if (legal && innings.balls > 0 && innings.balls % 6 === 0) {
      handleOverEnd(updated, live, innings);
    }
  }

  return stamp(updated);
};

export const takeWicket = (
  match,
  { wicketType, outBatsman, helper = null, runs = 0, extraMode = "NORMAL" },
) => {
  if (match.status === "COMPLETED") return match;
  if (!outBatsman || !match.live?.bowler || !match.live?.striker) return match;

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
  const deliveryType = isWide ? "WIDE" : isNoBall ? "NO_BALL" : "WICKET";
  const legal = isLegalDelivery(updated, deliveryType);
  const automaticExtra = automaticExtraFor(updated, deliveryType);
  const completedRuns = Math.max(0, Number(runs || 0));
  const totalRuns = completedRuns + automaticExtra;

  ensureBatter(innings, live.striker);
  ensureBatter(innings, outBatsman);
  ensureBowler(innings, live.bowler);

  innings.wickets += 1;
  if (!live.outBatsmen.includes(outBatsman)) live.outBatsmen.push(outBatsman);

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
    ballInOver: legal ? (innings.balls % 6) + 1 : innings.balls % 6,
    actualBallNum: legal ? innings.balls + 1 : innings.balls,
    striker: live.striker,
    nonStriker: live.nonStriker,
    bowler: live.bowler,
    runs: totalRuns,
    battingRuns: isWide ? 0 : completedRuns,
    type: deliveryType,
    extra: extraMode,
    wicket: { type: wicketType, outBatsman, helper },
    isWicket: true,
    timestamp: Date.now(),
  });

  innings.totalRuns += totalRuns;
  innings.bowlingStats[live.bowler].runs += totalRuns;
  if (!isWide) innings.battingStats[live.striker].runs += completedRuns;

  if (legal) {
    innings.battingStats[live.striker].balls += 1;
    innings.balls += 1;
    innings.bowlingStats[live.bowler].balls += 1;
  }
  if (isWide) innings.extras.wides += totalRuns;
  if (isNoBall) innings.extras.noBalls += automaticExtra;
  if (BOWLER_WICKETS.has(wicketType) && !isNoBall) {
    innings.bowlingStats[live.bowler].wickets += 1;
  }

  const dismissal = { type: wicketType, bowler: live.bowler, fielder: helper || null };
  innings.battingStats[outBatsman].dismissal = dismissal;
  innings.dismissals[outBatsman] = dismissal;

  if (completedRuns % 2 === 1) {
    [live.striker, live.nonStriker] = [live.nonStriker, live.striker];
  }
  if (sameName(live.striker, outBatsman)) live.striker = null;
  if (sameName(live.nonStriker, outBatsman)) live.nonStriker = null;

  const resolved = evaluateMatchState(updated);
  if (!resolved && updated.status !== "COMPLETED") {
    if (legal && innings.balls > 0 && innings.balls % 6 === 0) {
      handleOverEnd(updated, live, innings);
    }
  }

  return stamp(updated);
};
