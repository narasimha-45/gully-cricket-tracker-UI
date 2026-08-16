import {
  createEmptyInnings,
  getAggregateRuns,
  getFinalInningsTarget,
  getMaxWickets,
  getPlayersForTeam,
  getScheduledInningsCount,
  getScheduledTeamsForInnings,
  isTestMatch,
} from "../../../utils/matchModel";
import { resetResolvedUi } from "./matchPrimitives";

const endMatchWithResult = (match, result) => {
  match.status = "COMPLETED";
  match.result = result;
  match.live.pendingNextInnings = false;
  match.live.pendingNextInningsIndex = null;
  match.live.pendingSuperOver = false;
  resetResolvedUi(match);
  return true;
};

const endLimitedOversMatch = (match, type) => {
  const total = match.innings.length;
  const first = match.innings[total - 2];
  const chase = match.innings[total - 1];
  const isSuperOver = Boolean(chase?.isSuperOver);

  if (type === "CHASE") {
    const maxWickets = getMaxWickets(match, chase.battingTeam, isSuperOver);
    return endMatchWithResult(match, {
      winner: chase.battingTeam,
      type: isSuperOver ? "SUPER_OVER" : "WICKETS",
      margin: Math.max(0, maxWickets - chase.wickets),
    });
  }

  return endMatchWithResult(match, {
    winner: first.battingTeam,
    type: isSuperOver ? "SUPER_OVER" : "RUNS",
    margin: Math.max(0, first.totalRuns - chase.totalRuns),
  });
};

const isAllOut = (match, innings) => {
  const maxWickets = getMaxWickets(
    match,
    innings.battingTeam,
    Boolean(innings.isSuperOver),
  );
  return maxWickets > 0 && innings.wickets >= maxWickets;
};

const isInningsComplete = (innings, battingPlayers, totalOvers, matchType) => {
  const availableWickets = Math.max(0, (battingPlayers?.length || 0) - 1);
  const wicketLimit = innings.isSuperOver
    ? Math.min(2, availableWickets)
    : availableWickets;

  if (wicketLimit > 0 && innings.wickets >= wicketLimit) return true;
  if (matchType === "TEST" && !innings.isSuperOver) return false;

  const overLimit = innings.isSuperOver ? 1 : Number(totalOvers);
  return Number.isFinite(overLimit) && overLimit > 0
    ? innings.balls >= overLimit * 6
    : false;
};

const isTargetAchieved = (innings, target) =>
  Number.isFinite(target) && innings.totalRuns >= target;

export const prepareNextInnings = (match) => {
  match.live.pendingNextInnings = true;
  match.live.pendingNextInningsIndex = match.live.inningsIndex + 1;
};

const resolveFinalTestInnings = (match) => {
  const index = match.live.inningsIndex;
  const current = match.innings[index];
  const battingTotal = getAggregateRuns(match, current.battingTeam, {
    beforeIndex: index + 1,
  });
  const oppositionTotal = getAggregateRuns(match, current.bowlingTeam, {
    beforeIndex: index + 1,
  });

  if (battingTotal === oppositionTotal) {
    return endMatchWithResult(match, { winner: null, type: "TIE", margin: 0 });
  }

  if (battingTotal > oppositionTotal) {
    const maxWickets = getMaxWickets(match, current.battingTeam, false);
    return endMatchWithResult(match, {
      winner: current.battingTeam,
      type: "WICKETS",
      margin: Math.max(0, maxWickets - current.wickets),
    });
  }

  return endMatchWithResult(match, {
    winner: current.bowlingTeam,
    type: "RUNS",
    margin: oppositionTotal - battingTotal,
  });
};

const resolvePossibleInningsVictory = (match) => {
  const currentIndex = match.live.inningsIndex;
  const scheduledCount = getScheduledInningsCount(match);
  if (currentIndex !== scheduledCount - 2) return false;

  const nextTeams = getScheduledTeamsForInnings(match, currentIndex + 1);
  const nextTeamPriorRuns = getAggregateRuns(match, nextTeams.battingTeam, {
    beforeIndex: currentIndex + 1,
  });
  const currentTeamRuns = getAggregateRuns(
    match,
    match.innings[currentIndex].battingTeam,
    { beforeIndex: currentIndex + 1 },
  );

  if (nextTeamPriorRuns <= currentTeamRuns) return false;

  return endMatchWithResult(match, {
    winner: nextTeams.battingTeam,
    type: "INNINGS",
    margin: nextTeamPriorRuns - currentTeamRuns,
  });
};

export const completeCurrentTestInnings = (match, reason = "DECLARED") => {
  const currentIndex = match.live.inningsIndex;
  const current = match.innings[currentIndex];
  const scheduledCount = getScheduledInningsCount(match);
  current.completed = true;
  current.completionReason = reason;

  if (currentIndex === scheduledCount - 1)
    return resolveFinalTestInnings(match);
  if (resolvePossibleInningsVictory(match)) return true;
  prepareNextInnings(match);
  return true;
};

const evaluateTestMatchState = (match) => {
  const currentIndex = match.live.inningsIndex;
  const current = match.innings[currentIndex];
  const scheduledCount = getScheduledInningsCount(match);

  if (currentIndex === scheduledCount - 1) {
    const target = getFinalInningsTarget(match, currentIndex);
    if (isTargetAchieved(current, target)) {
      const maxWickets = getMaxWickets(match, current.battingTeam, false);
      return endMatchWithResult(match, {
        winner: current.battingTeam,
        type: "WICKETS",
        margin: Math.max(0, maxWickets - current.wickets),
      });
    }
  }

  if (isAllOut(match, current)) {
    completeCurrentTestInnings(match, "ALL_OUT");
    return true;
  }
  return false;
};

const evaluateLimitedOversState = (match) => {
  const { live, innings, totalOvers } = match;
  const current = innings[live.inningsIndex];
  const battingPlayers = getPlayersForTeam(match, current.battingTeam);

  if (live.inningsIndex % 2 === 1) {
    const previous = innings[live.inningsIndex - 1];
    if (isTargetAchieved(current, previous.totalRuns + 1)) {
      endLimitedOversMatch(match, "CHASE");
      return true;
    }
  }

  if (
    !isInningsComplete(current, battingPlayers, totalOvers, match.matchType)
  ) {
    return false;
  }

  current.completed = true;
  current.completionReason = isAllOut(match, current) ? "ALL_OUT" : "OVERS";

  if (live.inningsIndex === 0) {
    prepareNextInnings(match);
    return true;
  }

  if (live.inningsIndex % 2 === 1) {
    const previous = innings[live.inningsIndex - 1];
    if (current.totalRuns === previous.totalRuns) {
      match.live.pendingSuperOver = true;
      return true;
    }
    endLimitedOversMatch(match, "DEFEND");
    return true;
  }

  if (current.isSuperOver) {
    const nextIndex = live.inningsIndex + 1;
    match.live.inningsIndex = nextIndex;
    match.innings[nextIndex] = createEmptyInnings({
      battingTeam: current.bowlingTeam,
      bowlingTeam: current.battingTeam,
      inningsNumber: 1,
      isSuperOver: true,
    });
    match.live.striker = null;
    match.live.nonStriker = null;
    match.live.bowler = null;
    match.live.lastOverBowler = null;
    match.live.outBatsmen = [];
    return true;
  }

  return false;
};

export const evaluateMatchState = (match) => {
  const current = match?.innings?.[match?.live?.inningsIndex];
  if (!current) return false;
  if (isTestMatch(match) && !current.isSuperOver) {
    return evaluateTestMatchState(match);
  }
  return evaluateLimitedOversState(match);
};

export const completeAsDraw = (match) =>
  endMatchWithResult(match, { winner: null, type: "DRAW", margin: 0 });
