export const BOWLER_WICKETS = new Set([
  "BOWLED",
  "CAUGHT",
  "LBW",
  "STUMPED",
  "HIT_WICKET",
  "SPECIAL",
]);

export const stamp = (match) => {
  match.updatedAt = Date.now();
  return match;
};

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

export const ensureBatter = (innings, player) => {
  if (!player) return;
  innings.battingStats ||= {};
  innings.battingStats[player] ||= emptyBattingStats(
    Object.keys(innings.battingStats).length + 1,
  );
};

export const ensureBowler = (innings, player) => {
  if (!player) return;
  innings.bowlingStats ||= {};
  innings.bowlingStats[player] ||= emptyBowlingStats();
};

export const resetResolvedUi = (match) => {
  match.ui = {
    ...(match.ui || {}),
    matchResultSeen: false,
  };
};

export const isLegalDelivery = (match, type) => {
  if (type === "RUN" || type === "WICKET" || type === "BYE") return true;
  if (type === "WIDE") return match.rules?.wide?.extraBall === false;
  if (type === "NO_BALL") return match.rules?.noBall?.extraBall === false;
  return false;
};

export const handleOverEnd = (match, live, innings) => {
  if (innings.balls <= 0 || innings.balls % 6 !== 0) return;

  const isMaiden = (innings.thisOver || []).every((ball) => {
    if (ball.type === "BYE") return true;
    return (
      Number(ball.runs || 0) === 0 &&
      ball.type !== "WIDE" &&
      ball.type !== "NO_BALL"
    );
  });

  ensureBowler(innings, live.bowler);
  if (isMaiden && !innings.thisOverBowlerChanged && live.bowler) {
    innings.bowlingStats[live.bowler].maidens += 1;
  }

  live.lastOverBowler = live.bowler;
  live.bowler = null;
  [live.striker, live.nonStriker] = [live.nonStriker, live.striker];
  innings.thisOver = [];
  innings.thisOverBowlerChanged = false;
  void match;
};
