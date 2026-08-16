import { deepCopy } from "../../../utils/helpers";
import { takeSnapshot } from "../../../utils/snapShot";
import {
  canEnforceFollowOn,
  createEmptyInnings,
  getScheduledTeamsForInnings,
  getTeamInningsOrdinal,
  isTestMatch,
  sameName,
} from "../../../utils/matchModel";
import { ensureBatter, ensureBowler, stamp } from "./matchPrimitives";
import { completeAsDraw, completeCurrentTestInnings } from "./matchResolution";

export const selectPlayer = (match, { role, player, extraMode = "NORMAL" }) => {
  if (!player || match.status === "COMPLETED") return match;
  const updated = deepCopy(match);
  takeSnapshot(updated, "SELECTION", extraMode);
  const innings = updated.innings[updated.live.inningsIndex];
  updated.live[role] = player;
  if (role === "striker" || role === "nonStriker") ensureBatter(innings, player);
  if (role === "bowler") ensureBowler(innings, player);
  return stamp(updated);
};

export const changeBowler = (match, { player, extraMode = "NORMAL" }) => {
  if (
    !player ||
    match.status === "COMPLETED" ||
    sameName(player, match.live?.bowler) ||
    sameName(player, match.live?.striker) ||
    sameName(player, match.live?.nonStriker)
  ) {
    return match;
  }

  const updated = deepCopy(match);
  takeSnapshot(updated, "BOWLER_CHANGE", extraMode);
  const innings = updated.innings[updated.live.inningsIndex];
  innings.thisOverBowlerChanged =
    Boolean(updated.live.bowler && (innings.thisOver || []).length > 0) ||
    Boolean(innings.thisOverBowlerChanged);
  updated.live.bowler = player;
  ensureBowler(innings, player);
  return stamp(updated);
};

export const switchStrike = (match, { extraMode = "NORMAL" } = {}) => {
  if (!match.live?.striker || !match.live?.nonStriker) return match;
  const updated = deepCopy(match);
  takeSnapshot(updated, "STRIKE_CHANGE", extraMode);
  [updated.live.striker, updated.live.nonStriker] = [
    updated.live.nonStriker,
    updated.live.striker,
  ];
  return stamp(updated);
};

export const retireBatter = (match, { player }) => {
  if (!player || match.status === "COMPLETED") return match;
  const updated = deepCopy(match);
  takeSnapshot(updated, "RETIRED");
  const live = updated.live;
  const innings = updated.innings[live.inningsIndex];
  innings.ballByBall ||= [];
  innings.ballByBall.push({
    type: "RETIRE",
    striker: live.striker,
    nonStriker: live.nonStriker,
    retired: player,
    over: Math.floor(innings.balls / 6),
    ballInOver: innings.balls % 6,
    actualBallNum: innings.balls,
    timestamp: Date.now(),
  });
  if (sameName(live.striker, player)) live.striker = null;
  if (sameName(live.nonStriker, player)) live.nonStriker = null;
  return stamp(updated);
};

export const startNextInnings = (match, { followOn = false } = {}) => {
  if (!match?.live?.pendingNextInnings) return match;
  const updated = deepCopy(match);
  takeSnapshot(updated, followOn ? "ENFORCE_FOLLOW_ON" : "START_NEXT_INNINGS");

  if (followOn && canEnforceFollowOn(updated)) {
    updated.testConfig = { ...(updated.testConfig || {}), followOnEnforced: true };
  }

  const nextIndex = updated.live.inningsIndex + 1;
  const scheduledTeams = getScheduledTeamsForInnings(updated, nextIndex);
  updated.live.inningsIndex = nextIndex;
  updated.live.pendingNextInnings = false;
  updated.live.pendingNextInningsIndex = null;
  updated.innings[nextIndex] = createEmptyInnings({
    ...scheduledTeams,
    inningsNumber: getTeamInningsOrdinal(updated, nextIndex),
  });
  updated.live = {
    ...updated.live,
    striker: null,
    nonStriker: null,
    bowler: null,
    lastOverBowler: null,
    outBatsmen: [],
  };
  return stamp(updated);
};

export const startSuperOver = (match) => {
  if (!match?.live?.pendingSuperOver) return match;
  const updated = deepCopy(match);
  takeSnapshot(updated, "START_SUPER_OVER");
  const newIndex = updated.innings.length;
  updated.live.inningsIndex = newIndex;
  updated.live.pendingSuperOver = false;

  let battingTeam;
  let bowlingTeam;
  if (newIndex === 2) {
    battingTeam = updated.innings[1].battingTeam;
    bowlingTeam = updated.innings[1].bowlingTeam;
  } else {
    const previousSecondSuperOverInnings = updated.innings[newIndex - 1];
    battingTeam = previousSecondSuperOverInnings.battingTeam;
    bowlingTeam = previousSecondSuperOverInnings.bowlingTeam;
  }

  updated.innings[newIndex] = createEmptyInnings({
    battingTeam,
    bowlingTeam,
    inningsNumber: 1,
    isSuperOver: true,
  });
  updated.live = {
    ...updated.live,
    striker: null,
    nonStriker: null,
    bowler: null,
    lastOverBowler: null,
    outBatsmen: [],
  };
  return stamp(updated);
};

export const declareTestInnings = (match) => {
  if (!isTestMatch(match) || match.status !== "LIVE") return match;
  const updated = deepCopy(match);
  takeSnapshot(updated, "DECLARE_TEST_INNINGS");
  completeCurrentTestInnings(updated, "DECLARED");
  return stamp(updated);
};

export const finishTestAsDraw = (match) => {
  if (!isTestMatch(match) || match.status !== "LIVE") return match;
  const updated = deepCopy(match);
  takeSnapshot(updated, "END_TEST_AS_DRAW");
  const current = updated.innings[updated.live.inningsIndex];
  current.completed = true;
  current.completionReason = "DRAW";
  completeAsDraw(updated);
  return stamp(updated);
};

export const updateMatchSettings = (match, patch) => {
  if (!patch || typeof patch !== "object") return match;
  return stamp({ ...deepCopy(match), ...deepCopy(patch) });
};

export const addTeamPlayer = (match, { teamKey, player }) => {
  if (!teamKey || !player || !match?.teams?.[teamKey]) return match;
  const normalized = String(player).trim().toLowerCase();
  if (!normalized) return match;
  const updated = deepCopy(match);
  const players = updated.teams[teamKey].players || [];
  if (!players.some((item) => sameName(item, normalized))) players.push(normalized);
  updated.teams[teamKey].players = players;
  return stamp(updated);
};

export const removeTeamPlayer = (match, { teamKey, player }) => {
  if (!teamKey || !player || !match?.teams?.[teamKey]) return match;
  const updated = deepCopy(match);
  updated.teams[teamKey].players = (updated.teams[teamKey].players || []).filter(
    (item) => !sameName(item, player),
  );
  return stamp(updated);
};
