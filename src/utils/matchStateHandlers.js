import { saveMatch } from "../storage/matchDB";
import { deepCopy } from "./helpers";
import { takeSnapshot } from "./snapShot";
import {
  getAggregateRuns,
  getFinalInningsTarget,
  getMaxWickets,
  getPlayersForTeam,
  getScheduledInningsCount,
  getScheduledTeamsForInnings,
  isTestMatch,
  sameName,
} from "./matchModel";

const persist = (updated, setMatch) => {
  updated.updatedAt = Date.now();
  saveMatch(updated).catch(() => undefined);
  setMatch(updated);
};

const resetResolvedUi = (updated) => {
  updated.ui = {
    ...(updated.ui || {}),
    matchResultSeen: false,
  };
};

export const endFirstInnings = (updated, setMatch) => {
  const current = updated.innings[updated.live.inningsIndex];
  current.completed = true;
  updated.live.pendingNextInnings = true;
  updated.live.pendingNextInningsIndex = updated.live.inningsIndex + 1;
  persist(updated, setMatch);
};

export const endMatchWithResult = (updated, result, setMatch) => {
  updated.status = "COMPLETED";
  updated.result = result;
  updated.live.pendingNextInnings = false;
  updated.live.pendingNextInningsIndex = null;
  updated.live.pendingSuperOver = false;
  resetResolvedUi(updated);
  persist(updated, setMatch);
};

export const endMatch = (updated, type, setMatch) => {
  const total = updated.innings.length;
  const first = updated.innings[total - 2];
  const chase = updated.innings[total - 1];
  const isSuperOver = Boolean(chase?.isSuperOver);

  if (type === "CHASE") {
    const maxWickets = getMaxWickets(updated, chase.battingTeam, isSuperOver);
    endMatchWithResult(
      updated,
      {
        winner: chase.battingTeam,
        type: isSuperOver ? "SUPER_OVER" : "WICKETS",
        margin: Math.max(0, maxWickets - chase.wickets),
      },
      setMatch,
    );
    return;
  }

  endMatchWithResult(
    updated,
    {
      winner: first.battingTeam,
      type: isSuperOver ? "SUPER_OVER" : "RUNS",
      margin: Math.max(0, first.totalRuns - chase.totalRuns),
    },
    setMatch,
  );
};

export const updateLive = (updates, match, setMatch) => {
  const updated = {
    ...match,
    live: {
      ...match.live,
      ...updates,
    },
    updatedAt: Date.now(),
  };

  saveMatch(updated).catch(() => undefined);
  setMatch(updated);
};

const isAllOut = (match, innings) => {
  const maxWickets = getMaxWickets(
    match,
    innings.battingTeam,
    Boolean(innings.isSuperOver),
  );
  return maxWickets > 0 && innings.wickets >= maxWickets;
};

export const isInningsComplete = (
  innings,
  battingPlayers,
  totalOvers,
  matchType = "OVERS",
) => {
  const availableWickets = Math.max(
    0,
    (battingPlayers?.length || 0) - 1,
  );
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

export const isTargetAchieved = (innings, target) =>
  Number.isFinite(target) && innings.totalRuns >= target;

const prepareNextInnings = (updated) => {
  updated.live.pendingNextInnings = true;
  updated.live.pendingNextInningsIndex = updated.live.inningsIndex + 1;
};

const resolveFinalTestInnings = (updated, setMatch) => {
  const index = updated.live.inningsIndex;
  const current = updated.innings[index];
  const battingTotal = getAggregateRuns(updated, current.battingTeam, {
    beforeIndex: index + 1,
  });
  const oppositionTotal = getAggregateRuns(updated, current.bowlingTeam, {
    beforeIndex: index + 1,
  });

  if (battingTotal === oppositionTotal) {
    endMatchWithResult(
      updated,
      { winner: "TIE", type: "TIE", margin: 0 },
      setMatch,
    );
    return;
  }

  if (battingTotal > oppositionTotal) {
    const maxWickets = getMaxWickets(updated, current.battingTeam, false);
    endMatchWithResult(
      updated,
      {
        winner: current.battingTeam,
        type: "WICKETS",
        margin: Math.max(0, maxWickets - current.wickets),
      },
      setMatch,
    );
    return;
  }

  endMatchWithResult(
    updated,
    {
      winner: current.bowlingTeam,
      type: "RUNS",
      margin: oppositionTotal - battingTotal,
    },
    setMatch,
  );
};

const resolvePossibleInningsVictory = (updated, setMatch) => {
  const currentIndex = updated.live.inningsIndex;
  const scheduledCount = getScheduledInningsCount(updated);

  if (currentIndex !== scheduledCount - 2) return false;

  const nextTeams = getScheduledTeamsForInnings(updated, currentIndex + 1);
  const nextTeamPriorRuns = getAggregateRuns(updated, nextTeams.battingTeam, {
    beforeIndex: currentIndex + 1,
  });
  const currentTeamRuns = getAggregateRuns(
    updated,
    updated.innings[currentIndex].battingTeam,
    { beforeIndex: currentIndex + 1 },
  );

  if (nextTeamPriorRuns <= currentTeamRuns) return false;

  endMatchWithResult(
    updated,
    {
      winner: nextTeams.battingTeam,
      type: "INNINGS",
      margin: nextTeamPriorRuns - currentTeamRuns,
    },
    setMatch,
  );
  return true;
};

export const completeCurrentTestInnings = (
  updated,
  setMatch,
  reason = "DECLARED",
) => {
  const currentIndex = updated.live.inningsIndex;
  const current = updated.innings[currentIndex];
  const scheduledCount = getScheduledInningsCount(updated);

  current.completed = true;
  current.completionReason = reason;

  if (currentIndex === scheduledCount - 1) {
    resolveFinalTestInnings(updated, setMatch);
    return true;
  }

  if (resolvePossibleInningsVictory(updated, setMatch)) return true;

  prepareNextInnings(updated);
  persist(updated, setMatch);
  return true;
};

export const declareCurrentTestInnings = ({ match, setMatch }) => {
  if (!isTestMatch(match) || match.status !== "LIVE") return;

  const updated = deepCopy(match);
  takeSnapshot(updated, "DECLARE_TEST_INNINGS");
  completeCurrentTestInnings(updated, setMatch, "DECLARED");
};

export const finishTestAsDraw = ({ match, setMatch }) => {
  if (!isTestMatch(match) || match.status !== "LIVE") return;

  const updated = deepCopy(match);
  takeSnapshot(updated, "END_TEST_AS_DRAW");
  const current = updated.innings[updated.live.inningsIndex];
  current.completed = true;
  current.completionReason = "DRAW";

  endMatchWithResult(
    updated,
    { winner: "DRAW", type: "DRAW", margin: 0 },
    setMatch,
  );
};

const evaluateTestMatchState = (updated, setMatch) => {
  const currentIndex = updated.live.inningsIndex;
  const current = updated.innings[currentIndex];
  const scheduledCount = getScheduledInningsCount(updated);

  if (currentIndex === scheduledCount - 1) {
    const target = getFinalInningsTarget(updated, currentIndex);
    if (isTargetAchieved(current, target)) {
      const maxWickets = getMaxWickets(updated, current.battingTeam, false);
      endMatchWithResult(
        updated,
        {
          winner: current.battingTeam,
          type: "WICKETS",
          margin: Math.max(0, maxWickets - current.wickets),
        },
        setMatch,
      );
      return true;
    }
  }

  if (isAllOut(updated, current)) {
    return completeCurrentTestInnings(updated, setMatch, "ALL_OUT");
  }

  return false;
};

const evaluateLimitedOversState = (updated, setMatch) => {
  const { live, innings, totalOvers } = updated;
  const current = innings[live.inningsIndex];
  const battingPlayers = getPlayersForTeam(updated, current.battingTeam);

  if (live.inningsIndex % 2 === 1) {
    const previous = innings[live.inningsIndex - 1];
    const target = previous.totalRuns + 1;

    if (isTargetAchieved(current, target)) {
      endMatch(updated, "CHASE", setMatch);
      return true;
    }
  }

  if (
    !isInningsComplete(
      current,
      battingPlayers,
      totalOvers,
      updated.matchType,
    )
  ) {
    return false;
  }

  current.completed = true;
  current.completionReason = isAllOut(updated, current) ? "ALL_OUT" : "OVERS";

  if (live.inningsIndex === 0) {
    prepareNextInnings(updated);
    persist(updated, setMatch);
    return true;
  }

  if (live.inningsIndex % 2 === 1) {
    const previous = innings[live.inningsIndex - 1];

    if (current.totalRuns === previous.totalRuns) {
      updated.live.pendingSuperOver = true;
      persist(updated, setMatch);
      return true;
    }

    endMatch(updated, "DEFEND", setMatch);
    return true;
  }

  if (current.isSuperOver) {
    const nextIndex = live.inningsIndex + 1;
    const nextTeams = {
      battingTeam: current.bowlingTeam,
      bowlingTeam: current.battingTeam,
    };

    updated.live.inningsIndex = nextIndex;
    updated.innings[nextIndex] = {
      battingTeam: nextTeams.battingTeam,
      bowlingTeam: nextTeams.bowlingTeam,
      inningsNumber: 1,
      totalRuns: 0,
      balls: 0,
      wickets: 0,
      battingStats: {},
      bowlingStats: {},
      dismissals: {},
      thisOver: [],
      ballByBall: [],
      isSuperOver: true,
      extras: { wides: 0, noBalls: 0 },
      completed: false,
    };

    updated.live.striker = null;
    updated.live.nonStriker = null;
    updated.live.bowler = null;
    updated.live.lastOverBowler = null;
    updated.live.outBatsmen = [];

    persist(updated, setMatch);
    return true;
  }

  return false;
};

export const evaluateMatchState = (updated, setMatch) => {
  const current = updated?.innings?.[updated?.live?.inningsIndex];
  if (!current) return false;

  if (isTestMatch(updated) && !current.isSuperOver) {
    return evaluateTestMatchState(updated, setMatch);
  }

  return evaluateLimitedOversState(updated, setMatch);
};

export const hasSameTeam = sameName;
