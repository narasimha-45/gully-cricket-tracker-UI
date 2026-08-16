/**
 * Builds the payload sent to POST /matches/create.
 * Extracted so both the "finish match" flow and the background retry queue
 * build the exact same shape from a stored match — one place to change it.
 */
export const buildMatchSyncPayload = (match) => ({
  seasonId: match.seasonId,

  teams: match.teams, // teamA, teamB, players
  toss: match.toss, // winner + decision
  rules: match.rules, // wide/no-ball rules
  totalOvers: match.totalOvers,

  matchType: match.matchType,
  testConfig: match.testConfig || null,

  innings: match.innings.map((inn) => ({
    battingTeam: inn.battingTeam,
    bowlingTeam: inn.bowlingTeam,
    inningsNumber: inn.inningsNumber ?? 1,

    totalRuns: inn.totalRuns,
    wickets: inn.wickets,
    balls: inn.balls,

    battingStats: inn.battingStats,
    bowlingStats: inn.bowlingStats,

    extras: inn.extras || { wides: 0, noBalls: 0 },
    dismissals: inn.dismissals || {},
    ballByBall: inn.ballByBall || [],
    isSuperOver: inn.isSuperOver ?? false,
    completed: true,
    completionReason: inn.completionReason ?? null,
  })),

  result: {
    winner: match.result.winner,
    type: match.result.type,
    margin: match.result.margin,
    manOfTheMatch: match.result.manOfTheMatch,
  },

  fieldingStats: match.fieldingStats,
});
