import { saveMatch } from "../storage/matchDB";
import { createLocalMatchId } from "./matchIdentity";

export const recreateMatch = async (match, navigate) => {
  const newMatchId = createLocalMatchId();
  const { followOnEnforced: _followOnEnforced, ...reusableTestConfig } =
    match.testConfig || {};
  const now = Date.now();

  const newMatch = {
    id: newMatchId,
    seasonId: match.seasonId,
    matchType: match.matchType,
    totalOvers: match.totalOvers,
    testConfig: match.testConfig ? reusableTestConfig : null,
    rules: structuredClone(match.rules || {}),
    teams: {
      teamA: { ...match.teams.teamA, players: [...match.teams.teamA.players] },
      teamB: { ...match.teams.teamB, players: [...match.teams.teamB.players] },
    },
    toss: null,
    innings: [],
    live: null,
    status: "setup",
    schemaVersion: 3,
    syncStatus: "local",
    createdAt: now,
    updatedAt: now,
  };

  await saveMatch(newMatch);
  navigate(`/season/${match.seasonId}/match/${newMatchId}/toss`);
};
