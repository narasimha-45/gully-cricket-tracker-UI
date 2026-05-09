import { saveMatch } from "../storage/matchDB";

export const endFirstInnings = (updated,setMatch) => {
    updated.innings[0].completed = true;
    updated.live.pendingNextInnings = true;

    saveMatch(updated);
    setMatch(updated);
  };

export const endMatch = (updated, type,setMatch) => {
    updated.status = "COMPLETED";

    const i1 = updated.innings[0];
    const i2 = updated.innings[1];

    if (type === "CHASE") {
      const battingPlayers =
        i2.battingTeam === updated.teams.teamA.name
          ? updated.teams.teamA.players
          : updated.teams.teamB.players;

      updated.result = {
        winner: i2.battingTeam,
        type: "WICKETS",
        margin: battingPlayers.length - 1 - i2.wickets,
      };
    } else {
      updated.result = {
        winner: i1.battingTeam,
        type: "RUNS",
        margin: i1.totalRuns - i2.totalRuns,
      };
    }

    updated.ui = {
      ...(updated.ui || {}),
      matchResultSeen: false,
    };

    saveMatch(updated);
    setMatch(updated);
  };

  export const updateLive = (updates,match,setMatch) => {
    const updated = {
      ...match,
      live: { ...match.live, ...updates },
      updatedAt: Date.now(),
    };
    saveMatch(updated);
    setMatch(updated);
  };

  export const evaluateMatchState = (updated,setMatch) => {
  const { live, innings, teams, totalOvers } = updated;
  const currentInnings = updated.innings[live.inningsIndex];

  const battingPlayers =
    currentInnings.battingTeam === teams.teamA.name
      ? teams.teamA.players
      : teams.teamB.players;

  /* ---------- SECOND INNINGS: TARGET CHASE ---------- */
  if (live.inningsIndex === 1) {
    const target = updated.innings[0].totalRuns + 1;

    if (isTargetAchieved(currentInnings, target)) {
      endMatch(updated, "CHASE",setMatch);
      return;
    }
  }

  /* ---------- INNINGS COMPLETE ---------- */
  if (isInningsComplete(currentInnings, battingPlayers, totalOvers)) {
    if (live.inningsIndex === 0) {
      endFirstInnings(updated,setMatch);
    } else {
      endMatch(updated, "DEFEND",setMatch);
    }
  }
};

export const isInningsComplete = (innings, battingPlayers, totalOvers) => {
  if (innings.balls >= totalOvers * 6) return true;
  if (innings.wickets >= battingPlayers.length - 1) return true;
  return false;
};

export const isTargetAchieved = (innings, target) => {
  return innings.totalRuns >= target;
};
