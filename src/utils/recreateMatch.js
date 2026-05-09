export const recreateMatch = async (match) => {
    const newMatchId = `match_${Date.now()}`;

    const newMatch = {
      id: newMatchId,
      seasonId: match.seasonId,

      matchType: match.matchType,
      totalOvers: match.totalOvers,
      rules: match.rules,

      teams: {
        teamA: {
          name: match.teams.teamA.name,
          players: [...match.teams.teamA.players],
        },
        teamB: {
          name: match.teams.teamB.name,
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