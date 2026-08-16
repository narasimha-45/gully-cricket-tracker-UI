import { saveMatch } from "../storage/matchDB";
import { deepCopy } from "./helpers";
import { evaluateMatchState } from "./matchStateHandlers";
import { takeSnapshot } from "./snapShot";
import {
  canEnforceFollowOn,
  createEmptyInnings,
  getScheduledTeamsForInnings,
  getTeamInningsOrdinal,
  sameName,
} from "./matchModel";

const emptyBattingStats = (position) => ({
  battingPosition: position,
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  dismissal: null,
});

const emptyBowlingStats = () => ({
  balls: 0,
  runs: 0,
  wickets: 0,
  maidens: 0,
});

const persist = (updated, setMatch) => {
  updated.updatedAt = Date.now();
  saveMatch(updated).catch(() => undefined);
  setMatch(updated);
  return updated;
};

const ensureBatter = (innings, player) => {
  if (!player) return;
  innings.battingStats[player] ||= emptyBattingStats(
    Object.keys(innings.battingStats).length + 1,
  );
};

const ensureBowler = (innings, player) => {
  if (!player) return;
  innings.bowlingStats[player] ||= emptyBowlingStats();
};

export const selectLivePlayer = ({
  role,
  player,
  match,
  setMatch,
  extraMode = "NORMAL",
}) => {
  if (!player || match.status === "COMPLETED") return;

  const updated = deepCopy(match);
  takeSnapshot(updated, "SELECTION", extraMode);

  const innings = updated.innings[updated.live.inningsIndex];
  updated.live[role] = player;

  if (role === "striker" || role === "nonStriker") {
    ensureBatter(innings, player);
  }
  if (role === "bowler") ensureBowler(innings, player);

  return persist(updated, setMatch);
};

export const changeBowler = ({
  player,
  match,
  setMatch,
  extraMode = "NORMAL",
}) => {
  if (
    !player ||
    match.status === "COMPLETED" ||
    sameName(player, match.live?.bowler) ||
    sameName(player, match.live?.striker) ||
    sameName(player, match.live?.nonStriker)
  ) {
    return;
  }

  const updated = deepCopy(match);
  takeSnapshot(updated, "BOWLER_CHANGE", extraMode);

  const innings = updated.innings[updated.live.inningsIndex];
  innings.thisOverBowlerChanged = Boolean(
    updated.live.bowler && (innings.thisOver || []).length > 0,
  ) || Boolean(innings.thisOverBowlerChanged);

  updated.live.bowler = player;
  ensureBowler(innings, player);
  return persist(updated, setMatch);
};

// Backward-compatible export. New code should use selectLivePlayer.
export const pushSelectionHistory = (match, extraMode = "NORMAL") => {
  const updated = deepCopy(match);
  takeSnapshot(updated, "SELECTION", extraMode);
  return updated;
};

export const switchStrike = ({ match, setMatch, extraMode = "NORMAL" }) => {
  if (!match.live?.striker || !match.live?.nonStriker) return;

  const updated = deepCopy(match);
  takeSnapshot(updated, "STRIKE_CHANGE", extraMode);
  [updated.live.striker, updated.live.nonStriker] = [
    updated.live.nonStriker,
    updated.live.striker,
  ];
  return persist(updated, setMatch);
};

export const retireBatsman = (name, match, setMatch) => {
  if (!name || match.status === "COMPLETED") return;

  const updated = deepCopy(match);
  takeSnapshot(updated, "RETIRED");

  const live = updated.live;
  const innings = updated.innings[live.inningsIndex];
  innings.ballByBall ||= [];

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

  if (live.striker === name) live.striker = null;
  if (live.nonStriker === name) live.nonStriker = null;

  return persist(updated, setMatch);
};

export const handleOverEnd = (updated, live, innings) => {
  if (innings.balls <= 0 || innings.balls % 6 !== 0) return;

  const isMaiden = innings.thisOver.every(
    (ball) =>
      Number(ball.runs || 0) === 0 &&
      ball.type !== "WIDE" &&
      ball.type !== "NO_BALL",
  );

  ensureBowler(innings, live.bowler);
  if (isMaiden && !innings.thisOverBowlerChanged) {
    innings.bowlingStats[live.bowler].maidens += 1;
  }

  live.lastOverBowler = live.bowler;
  live.bowler = null;
  [live.striker, live.nonStriker] = [live.nonStriker, live.striker];
  innings.thisOver = [];
  innings.thisOverBowlerChanged = false;
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
    return recordBall({ type: "RUN", runs, match, setMatch, extraMode });
  }

  if (extraMode === "WIDE") {
    const automaticExtra = match.rules?.wide?.extraRun ? 1 : 0;
    const next = recordBall({
      type: "WIDE",
      runs: runs + automaticExtra,
      match,
      setMatch,
      extraMode,
    });
    setExtraMode("NORMAL");
    return next;
  }

  if (extraMode === "NO_BALL") {
    const automaticExtra = match.rules?.noBall?.extraRun ? 1 : 0;
    const next = recordBall({
      type: "NO_BALL",
      runs: runs + automaticExtra,
      match,
      setMatch,
      extraMode,
    });
    setExtraMode("NORMAL");
    return next;
  }
  return null;
};

export const recordBall = ({ type, runs = 0, match, setMatch, extraMode }) => {
  if (match.status === "COMPLETED") return;

  const updated = deepCopy(match);
  const live = updated.live;
  const innings = updated.innings[live.inningsIndex];

  if (!live.striker || !live.nonStriker || !live.bowler) return;

  takeSnapshot(updated, type, extraMode);

  innings.thisOver ||= [];
  innings.ballByBall ||= [];
  innings.extras ||= { wides: 0, noBalls: 0 };

  const isLegal = type === "RUN";
  const isWide = type === "WIDE";
  const isNoBall = type === "NO_BALL";
  const automaticExtra =
    (isWide && match.rules?.wide?.extraRun) ||
    (isNoBall && match.rules?.noBall?.extraRun)
      ? 1
      : 0;
  const battingRuns = isWide ? 0 : Math.max(0, runs - automaticExtra);
  const runningRuns = isWide ? Math.max(0, runs - automaticExtra) : battingRuns;

  ensureBatter(innings, live.striker);
  ensureBowler(innings, live.bowler);

  innings.thisOver.push({ type, runs, bowler: live.bowler });
  innings.ballByBall.push({
    over: Math.floor(innings.balls / 6),
    ballInOver: isLegal ? (innings.balls % 6) + 1 : innings.balls % 6,
    actualBallNum: isLegal ? innings.balls + 1 : innings.balls,
    striker: live.striker,
    nonStriker: live.nonStriker,
    bowler: live.bowler,
    runs,
    battingRuns,
    type,
    isWicket: false,
    timestamp: Date.now(),
  });

  innings.totalRuns += runs;
  innings.bowlingStats[live.bowler].runs += runs;

  if (!isWide) {
    const batter = innings.battingStats[live.striker];
    batter.runs += battingRuns;
    if (battingRuns === 4) batter.fours += 1;
    if (battingRuns === 6) batter.sixes += 1;
  }

  if (isLegal) {
    innings.battingStats[live.striker].balls += 1;
  }

  if (isWide) innings.extras.wides += runs;
  if (isNoBall) innings.extras.noBalls += automaticExtra;

  if (isLegal) {
    innings.balls += 1;
    innings.bowlingStats[live.bowler].balls += 1;
  }

  const matchResolved = evaluateMatchState(updated, setMatch);
  if (matchResolved || updated.status === "COMPLETED") {
    return persist(updated, setMatch);
  }

  if (isLegal && innings.balls > 0 && innings.balls % 6 === 0) {
    handleOverEnd(updated, live, innings);
  }

  const shouldRotate =
    (isLegal && runs % 2 === 1) ||
    ((isWide || isNoBall) && runningRuns % 2 === 1);

  if (shouldRotate) {
    [live.striker, live.nonStriker] = [live.nonStriker, live.striker];
  }

  return persist(updated, setMatch);
};

export const startNextInnings = ({ match, setMatch, followOn = false }) => {
  const updated = deepCopy(match);
  takeSnapshot(
    updated,
    followOn ? "ENFORCE_FOLLOW_ON" : "START_NEXT_INNINGS",
  );

  if (followOn && canEnforceFollowOn(updated)) {
    updated.testConfig = {
      ...(updated.testConfig || {}),
      followOnEnforced: true,
    };
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

  persist(updated, setMatch);
};

export const startSecondInnings = startNextInnings;

export const startSuperOver = ({ match, setMatch }) => {
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

  persist(updated, setMatch);
};
