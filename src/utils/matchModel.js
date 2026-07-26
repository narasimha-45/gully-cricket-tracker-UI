export const MATCH_TYPES = Object.freeze({
  OVERS: "OVERS",
  TEST: "TEST",
});

export const TEST_INNINGS_OPTIONS = Object.freeze({
  SINGLE: 1,
  DOUBLE: 2,
});

export const normalizeName = (value = "") =>
  String(value).trim().toLowerCase();

export const sameName = (left, right) =>
  normalizeName(left) === normalizeName(right);

export const isTestMatch = (match) => match?.matchType === MATCH_TYPES.TEST;

export const getTestInningsPerTeam = (match) => {
  const configured = Number(match?.testConfig?.inningsPerTeam);
  if (configured === TEST_INNINGS_OPTIONS.DOUBLE) {
    return TEST_INNINGS_OPTIONS.DOUBLE;
  }
  if (configured === TEST_INNINGS_OPTIONS.SINGLE) {
    return TEST_INNINGS_OPTIONS.SINGLE;
  }

  const regulationInnings = (match?.innings || []).filter(
    (innings) => !innings?.isSuperOver,
  ).length;
  return regulationInnings > 2
    ? TEST_INNINGS_OPTIONS.DOUBLE
    : TEST_INNINGS_OPTIONS.SINGLE;
};

export const getScheduledInningsCount = (match) =>
  isTestMatch(match) ? getTestInningsPerTeam(match) * 2 : 2;

export const getTeamKeyByName = (match, teamName) => {
  if (sameName(match?.teams?.teamA?.name, teamName)) return "teamA";
  if (sameName(match?.teams?.teamB?.name, teamName)) return "teamB";
  return null;
};

export const getTeamByName = (match, teamName) => {
  const key = getTeamKeyByName(match, teamName);
  return key ? match.teams[key] : null;
};

export const getPlayersForTeam = (match, teamName) =>
  getTeamByName(match, teamName)?.players || [];

export const createEmptyInnings = ({
  battingTeam,
  bowlingTeam,
  inningsNumber = 1,
  isSuperOver = false,
}) => ({
  battingTeam: normalizeName(battingTeam),
  bowlingTeam: normalizeName(bowlingTeam),
  inningsNumber,
  totalRuns: 0,
  wickets: 0,
  balls: 0,
  battingStats: {},
  bowlingStats: {},
  dismissals: {},
  thisOver: [],
  ballByBall: [],
  extras: {
    wides: 0,
    noBalls: 0,
  },
  thisOverBowlerChanged: false,
  completed: false,
  ...(isSuperOver ? { isSuperOver: true } : {}),
});

export const getFirstBattingTeam = (match) =>
  normalizeName(match?.innings?.[0]?.battingTeam);

export const getOtherTeamName = (match, teamName) => {
  const teamA = normalizeName(match?.teams?.teamA?.name);
  const teamB = normalizeName(match?.teams?.teamB?.name);
  return sameName(teamName, teamA) ? teamB : teamA;
};

export const getScheduledTeamsForInnings = (match, inningsIndex) => {
  const firstBattingTeam = getFirstBattingTeam(match);
  const secondBattingTeam = getOtherTeamName(match, firstBattingTeam);

  const followOnEnforced = Boolean(
    isTestMatch(match) &&
      getTestInningsPerTeam(match) === TEST_INNINGS_OPTIONS.DOUBLE &&
      match?.testConfig?.followOnEnforced,
  );

  if (followOnEnforced && inningsIndex >= 2) {
    const battingTeam = inningsIndex === 2
      ? secondBattingTeam
      : firstBattingTeam;

    return {
      battingTeam,
      bowlingTeam: getOtherTeamName(match, battingTeam),
    };
  }

  const battingTeam = inningsIndex % 2 === 0
    ? firstBattingTeam
    : secondBattingTeam;

  return {
    battingTeam,
    bowlingTeam: getOtherTeamName(match, battingTeam),
  };
};

export const getFollowOnLead = (match) => {
  if (
    !isTestMatch(match) ||
    getTestInningsPerTeam(match) !== TEST_INNINGS_OPTIONS.DOUBLE ||
    !match?.innings?.[0] ||
    !match?.innings?.[1]
  ) {
    return 0;
  }

  return Number(match.innings[0].totalRuns || 0) -
    Number(match.innings[1].totalRuns || 0);
};

export const canEnforceFollowOn = (match) =>
  Boolean(
    isTestMatch(match) &&
      getTestInningsPerTeam(match) === TEST_INNINGS_OPTIONS.DOUBLE &&
      match?.status === "LIVE" &&
      match?.live?.inningsIndex === 1 &&
      match?.live?.pendingNextInnings &&
      !match?.testConfig?.followOnEnforced &&
      getFollowOnLead(match) > 0,
  );

export const getTeamInningsOrdinal = (match, inningsIndex) => {
  const targetTeam = getScheduledTeamsForInnings(match, inningsIndex).battingTeam;
  let ordinal = 0;

  for (let index = 0; index <= inningsIndex; index += 1) {
    const scheduled = getScheduledTeamsForInnings(match, index);
    if (sameName(scheduled.battingTeam, targetTeam)) ordinal += 1;
  }

  return ordinal;
};

export const getAggregateRuns = (
  match,
  teamName,
  { beforeIndex = Number.POSITIVE_INFINITY } = {},
) =>
  (match?.innings || []).reduce((total, innings, index) => {
    if (index >= beforeIndex || innings?.isSuperOver) return total;
    return sameName(innings?.battingTeam, teamName)
      ? total + Number(innings?.totalRuns || 0)
      : total;
  }, 0);

export const getFinalInningsTarget = (match, inningsIndex = match?.live?.inningsIndex) => {
  if (!isTestMatch(match)) return null;
  if (inningsIndex !== getScheduledInningsCount(match) - 1) return null;

  const current = match?.innings?.[inningsIndex];
  if (!current) return null;

  const battingBefore = getAggregateRuns(match, current.battingTeam, {
    beforeIndex: inningsIndex,
  });
  const oppositionBefore = getAggregateRuns(match, current.bowlingTeam, {
    beforeIndex: inningsIndex,
  });

  return Math.max(1, oppositionBefore - battingBefore + 1);
};

export const getTestLeadStatus = (match, inningsIndex = match?.live?.inningsIndex) => {
  if (!isTestMatch(match)) return null;

  const current = match?.innings?.[inningsIndex];
  if (!current) return null;

  const battingTotal = getAggregateRuns(match, current.battingTeam, {
    beforeIndex: inningsIndex + 1,
  });
  const oppositionTotal = getAggregateRuns(match, current.bowlingTeam, {
    beforeIndex: inningsIndex + 1,
  });
  const difference = battingTotal - oppositionTotal;

  if (difference === 0) {
    return { type: "LEVEL", difference: 0, text: "Scores level" };
  }

  if (difference > 0) {
    return {
      type: "LEAD",
      difference,
      text: `${current.battingTeam} lead by ${difference}`,
    };
  }

  return {
    type: "TRAIL",
    difference: Math.abs(difference),
    text: `${current.battingTeam} trail by ${Math.abs(difference)}`,
  };
};

export const getMaxWickets = (match, teamName, isSuperOver = false) => {
  const availableWickets = Math.max(
    0,
    getPlayersForTeam(match, teamName).length - 1,
  );
  return isSuperOver ? Math.min(2, availableWickets) : availableWickets;
};
