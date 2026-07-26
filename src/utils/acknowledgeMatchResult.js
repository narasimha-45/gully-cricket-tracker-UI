import { api } from "../api";
import { saveMatch } from "../storage/matchDB";
import { deepCopy } from "./helpers";
import { deriveFieldingStats, calculateManOfTheMatch } from "./statsCalculator";

export const acknowledgeMatchResult = async (
  match,
  setMatch,
  setAckSubmitting,
  ackSubmitting,
) => {
  if (ackSubmitting) return;
  setAckSubmitting(true);

  const fieldingStats = deriveFieldingStats(match);

  const manOfTheMatch = calculateManOfTheMatch(match, fieldingStats);

  const payload = {
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
      manOfTheMatch: manOfTheMatch,
    },

    fieldingStats: fieldingStats,
  };

  try {
    await api.matches.createMatch(payload);
  } catch (err) {
    console.warn("Backend sync failed (match saved locally):", err.message);
  }

  const updated = deepCopy(match);
  updated.result.manOfTheMatch = manOfTheMatch;
  updated.fieldingStats = fieldingStats;
  updated.ui = {
    ...(updated.ui || {}),
    matchResultSeen: true,
  };

  saveMatch(updated); // local
  setMatch(updated);
};
