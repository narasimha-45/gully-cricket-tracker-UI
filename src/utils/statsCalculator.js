export function deriveFieldingStats(match) {
  const fielding = {};

  for (const inn of match.innings) {
    for (const d of Object.values(inn.dismissals || {})) {
      if (!d.fielder) continue;

      fielding[d.fielder] ||= { catches: 0, runOuts: 0 };

      if (d.type === "CAUGHT") fielding[d.fielder].catches++;
      if (d.type === "RUN_OUT") fielding[d.fielder].runOuts++;
    }
  }

  return fielding;
}

export function calculatePlayerScore(player, match, fieldingStats) {
  let points = 0;

  for (const inn of match.innings) {
    // ---------- Batting ----------
    const bat = inn.battingStats[player];
    if (bat) {
      points += bat.runs || 0;
      points += (bat.fours || 0) * 1;
      points += (bat.sixes || 0) * 2;

      if (bat.balls > 0) {
        const sr = (bat.runs / bat.balls) * 100;
        if (sr >= 150) points += 8;
        else if (sr >= 120) points += 4;
      }

      if (bat.runs >= 50) points += 8;
      if (bat.runs >= 100) points += 15;
      if (!bat.dismissal && bat.runs >= 20) points += 5;
    }

    // ---------- Bowling ----------
    const bowl = inn.bowlingStats[player];
    if (bowl) {
      points += (bowl.wickets || 0) * 20;
      points += (bowl.maidens || 0) * 8;

      if (bowl.balls > 0) {
        const overs = bowl.balls / 6;
        const eco = bowl.runs / overs;
        if (eco <= 6) points += 8;
        else if (eco <= 8) points += 4;
      }

      if (bowl.wickets >= 4) points += 8;
      if (bowl.wickets >= 5) points += 12;
    }
  }

  // ---------- Fielding ----------
  const f = fieldingStats[player];
  if (f) {
    points += (f.catches || 0) * 8;
    points += (f.runOuts || 0) * 10;
  }

  return points;
}

export function getWinningTeamPlayers(match) {
  const winner = match.result.winner;

  return winner === match.teams.teamA.name
    ? match.teams.teamA.players
    : match.teams.teamB.players;
}

export function calculateManOfTheMatch(match, fieldingStats) {
  const players = getWinningTeamPlayers(match);
  // const fieldingStats = deriveFieldingStats(match);

  let bestPlayer = null;
  let bestScore = -Infinity;

  for (const p of players) {
    const score = calculatePlayerScore(p, match, fieldingStats);
    if (score > bestScore) {
      bestScore = score;
      bestPlayer = p;
    }
  }

  return bestPlayer;
}
