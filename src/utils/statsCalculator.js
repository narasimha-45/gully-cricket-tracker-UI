import { sameName } from "./matchModel";

/* ============================================================
   FIELDING (unchanged — this part was fine)
   ============================================================ */
export function deriveFieldingStats(match) {
  const fielding = {};

  for (const inn of match.innings) {
    for (const d of Object.values(inn.dismissals || {})) {
      if (!d.fielder) continue;

      fielding[d.fielder] ||= { catches: 0, runOuts: 0, stumpings: 0 };

      if (d.type === "CAUGHT") fielding[d.fielder].catches++;
      if (d.type === "RUN_OUT") fielding[d.fielder].runOuts++;
      if (d.type === "STUMPED") fielding[d.fielder].stumpings++;
    }
  }

  return fielding;
}

/* ============================================================
   MATCH CONTEXT — computed once per match, from the match's own
   numbers. This is what makes scoring format-agnostic: a 5-over
   thrash and a 50-over grind each get judged against their own
   run rate, not against a T20 assumption baked into the code.
   ============================================================ */
export function computeMatchContext(match) {
  let totalRuns = 0;
  let totalBalls = 0;
  let totalBowlingRuns = 0;
  let totalBowlingBalls = 0;
  let totalWicketsFallen = 0;
  let highestInningsTotal = 0;

  for (const inn of match.innings) {
    let inningsRuns = 0;

    for (const bat of Object.values(inn.battingStats || {})) {
      totalRuns += bat.runs || 0;
      totalBalls += bat.balls || 0;
      inningsRuns += bat.runs || 0;
    }
    highestInningsTotal = Math.max(highestInningsTotal, inningsRuns);

    for (const bowl of Object.values(inn.bowlingStats || {})) {
      totalBowlingRuns += bowl.runs || 0;
      totalBowlingBalls += bowl.balls || 0;
    }

    totalWicketsFallen += Object.keys(inn.dismissals || {}).length;
  }

  return {
    // runs per 100 balls, derived from this match — not assumed
    avgStrikeRate: totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 100,
    // runs per over, derived from this match
    avgEconomy:
      totalBowlingBalls > 0 ? totalBowlingRuns / (totalBowlingBalls / 6) : 6,
    highestInningsTotal: highestInningsTotal || 1,
    totalWicketsFallen: totalWicketsFallen || 1,
  };
}

/* ============================================================
   PLAYER SCORE — same shape as before (runs, boundaries, wickets,
   fielding all still count directly), but every "was this good?"
   judgement is now relative to the match context instead of a
   fixed number.
   ============================================================ */
export function calculatePlayerScore(player, match, fieldingStats, context) {
  const ctx = context || computeMatchContext(match);
  let points = 0;

  for (const inn of match.innings) {
    // ---------- Batting ----------
    const bat = inn.battingStats[player];
    if (bat) {
      points += bat.runs || 0;
      points += (bat.fours || 0) * 1;
      points += (bat.sixes || 0) * 2;

      // Strike-rate bonus relative to this match's own scoring rate.
      // Ignore tiny samples (a 2-ball six shouldn't look like a great SR).
      if (bat.balls >= 5) {
        const sr = (bat.runs / bat.balls) * 100;
        const srRatio = sr / ctx.avgStrikeRate;
        if (srRatio >= 1.5) points += 8;
        else if (srRatio >= 1.2) points += 4;
      }

      // Milestones scaled to how big the biggest innings in THIS match
      // actually was. A 40 in a 60-all-out gully match is a "century"
      // in context; a fixed ">=50" bonus would miss that entirely.
      if (bat.runs > 0) {
        const share = bat.runs / ctx.highestInningsTotal;
        if (share >= 0.5) points += 8;
        if (share >= 0.8) points += 15;
      }

      if (!bat.dismissal && bat.runs / ctx.highestInningsTotal >= 0.2) {
        points += 5; // meaningful not-out contribution, scaled to context
      }
    }

    // ---------- Bowling ----------
    const bowl = inn.bowlingStats[player];
    if (bowl) {
      points += (bowl.wickets || 0) * 20;
      points += (bowl.maidens || 0) * 8;

      // Economy bonus relative to this match's own average economy.
      if (bowl.balls >= 6) {
        const overs = bowl.balls / 6;
        const eco = bowl.runs / overs;
        const ecoRatio = eco / ctx.avgEconomy;
        if (ecoRatio <= 0.7) points += 8;
        else if (ecoRatio <= 0.9) points += 4;
      }

      // Wicket-haul bonus scaled to how many wickets actually fell
      // in the match — "5-for" is meaningless if only 6 wickets fell
      // all match because sides had 6 players.
      if (bowl.wickets > 0) {
        const wicketShare = bowl.wickets / ctx.totalWicketsFallen;
        if (wicketShare >= 0.35) points += 8;
        if (wicketShare >= 0.5) points += 12;
      }
    }
  }

  // ---------- Fielding ----------
  const f = fieldingStats[player];
  if (f) {
    points += (f.catches || 0) * 8;
    points += (f.runOuts || 0) * 10;
    points += (f.stumpings || 0) * 10;
  }

  return points;
}

/* ============================================================
   WINNING TEAM PLAYERS (unchanged)
   ============================================================ */
export function getWinningTeamPlayers(match) {
  const winner = match.result?.winner;
  const teamAPlayers = match.teams?.teamA?.players || [];
  const teamBPlayers = match.teams?.teamB?.players || [];

  if (winner === "DRAW" || winner === "TIE") {
    return [...new Set([...teamAPlayers, ...teamBPlayers])];
  }

  if (sameName(winner, match.teams?.teamA?.name)) return teamAPlayers;
  if (sameName(winner, match.teams?.teamB?.name)) return teamBPlayers;
  return [...new Set([...teamAPlayers, ...teamBPlayers])];
}

/* ============================================================
   MAN OF THE MATCH
   - Scored against match context (fair across formats/over-counts)
   - Deterministic tie-break instead of "first one in the array wins"
   ============================================================ */
export function calculateManOfTheMatch(match, fieldingStats) {
  const players = getWinningTeamPlayers(match);
  const context = computeMatchContext(match);

  const ranked = players
    .map((p) => {
      const score = calculatePlayerScore(p, match, fieldingStats, context);

      // Tie-break signals: prefer the player who contributed in more
      // ways (batting + bowling + fielding), then raw runs, then wickets.
      let runs = 0;
      let wickets = 0;
      for (const inn of match.innings) {
        runs += inn.battingStats?.[p]?.runs || 0;
        wickets += inn.bowlingStats?.[p]?.wickets || 0;
      }
      const contributionTypes =
        (runs > 0 ? 1 : 0) + (wickets > 0 ? 1 : 0) + (fieldingStats[p] ? 1 : 0);

      return { player: p, score, contributionTypes, runs, wickets };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.contributionTypes !== a.contributionTypes)
        return b.contributionTypes - a.contributionTypes;
      if (b.runs !== a.runs) return b.runs - a.runs;
      return b.wickets - a.wickets;
    });

  return ranked[0]?.player ?? null;
}
