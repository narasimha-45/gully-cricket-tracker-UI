import { saveMatch } from "../storage/matchDB";

export const recreateMatch = async (match, navigate) => {
  const newMatchId = `match_${Date.now()}`;
  const { followOnEnforced: _followOnEnforced, ...reusableTestConfig } =
    match.testConfig || {};
  const newMatch = {
    id: newMatchId,
    seasonId: match.seasonId,
    matchType: match.matchType,
    totalOvers: match.totalOvers,
    testConfig: match.testConfig ? reusableTestConfig : null,
    rules: match.rules,
    teams: {
      teamA: {
        ...match.teams.teamA,
        players: [...match.teams.teamA.players],
      },
      teamB: {
        ...match.teams.teamB,
        players: [...match.teams.teamB.players],
      },
    },
    toss: null,
    innings: [],
    live: null,
    status: "setup",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveMatch(newMatch);
  navigate(`/season/${match.seasonId}/match/${newMatchId}/toss`);
};
